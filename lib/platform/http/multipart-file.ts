import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import Busboy from "busboy";

import { RouteError } from "@/lib/platform/http/route-errors";

const createMultipartRouteError = (message: string, status = 400): RouteError =>
  new RouteError(message, status);

const normalizeMultipartError = (error: unknown): RouteError => {
  if (error instanceof RouteError) {
    return error;
  }
  return createMultipartRouteError("Invalid form data", 400);
};

export const parseMultipartFileFromRequest = async (
  request: Request,
  {
    fieldName,
    maxBytes,
  }: {
    fieldName: string;
    maxBytes: number;
  }
): Promise<File> => {
  const contentType = request.headers.get("content-type")?.trim();
  if (!contentType) {
    throw createMultipartRouteError("Invalid upload content type", 415);
  }
  if (!request.body) {
    throw createMultipartRouteError("Invalid form data", 400);
  }

  const bodyStream = Readable.fromWeb(
    request.body as unknown as NodeReadableStream<Uint8Array>
  );
  const parser = Busboy({
    headers: {
      "content-type": contentType,
    },
    limits: {
      files: 1,
      fields: 32,
      parts: 33,
    },
  });

  let totalBytes = 0;
  let capturedFile:
    | {
        filename: string;
        mimeType: string;
        chunks: Buffer[];
      }
    | undefined;
  let truncated = false;

  return await new Promise<File>((resolve, reject) => {
    let settled = false;

    const finish = (error?: unknown, file?: File) => {
      if (settled) return;
      settled = true;
      if (error) {
        reject(normalizeMultipartError(error));
        return;
      }
      resolve(file as File);
    };

    const failForTooLargeBody = () =>
      finish(createMultipartRouteError("Image upload request is too large", 413));

    parser.on("file", (name, stream, info) => {
      if (name !== fieldName || capturedFile) {
        stream.resume();
        return;
      }

      capturedFile = {
        filename: info.filename || `${fieldName}.bin`,
        mimeType: info.mimeType || "application/octet-stream",
        chunks: [],
      };

      stream.on("data", (chunk: Buffer) => {
        capturedFile?.chunks.push(Buffer.from(chunk));
      });
      stream.on("limit", () => {
        truncated = true;
      });
      stream.on("error", (error) => {
        finish(error);
      });
    });

    parser.on("filesLimit", () => {
      finish(createMultipartRouteError("Image file is required", 400));
    });
    parser.on("fieldsLimit", failForTooLargeBody);
    parser.on("partsLimit", failForTooLargeBody);
    parser.on("error", (error) => {
      finish(error);
    });
    parser.on("close", () => {
      if (settled) {
        return;
      }
      if (truncated) {
        finish(createMultipartRouteError("Image upload request is too large", 413));
        return;
      }
      if (!capturedFile) {
        finish(createMultipartRouteError("Image file is required", 400));
        return;
      }
        finish(
        undefined,
        new File(
          capturedFile.chunks.map((chunk) => new Uint8Array(chunk)),
          capturedFile.filename,
          {
          type: capturedFile.mimeType,
          }
        )
      );
    });

    bodyStream.on("data", (chunk: Buffer) => {
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        const tooLargeError = createMultipartRouteError(
          "Image upload request is too large",
          413
        );
        parser.destroy(tooLargeError);
        bodyStream.destroy(tooLargeError);
        finish(tooLargeError);
      }
    });
    bodyStream.on("error", (error) => {
      finish(error);
    });
    bodyStream.on("end", () => {
      if (!settled) {
        parser.end();
      }
    });

    bodyStream.pipe(parser, { end: false });
  });
};
