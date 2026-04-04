import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import sharp from "sharp";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TEST_BUCKET = "family-meal.appspot.com";
const TEST_SERVER_ENV = {
  firebaseAdmin: {
    projectId: "demo-project",
    clientEmail: "demo@example.com",
    privateKey: "demo-key",
  },
  storageBucket: TEST_BUCKET,
  allowedEmails: [],
  allowRoleReassign: false,
  upstash: {
    url: undefined,
    token: undefined,
  },
  qaRouteToken: "",
  deploymentVersion: "test",
  isProduction: false,
} as const;

type StorageSaveCall = {
  bucketName: string;
  objectPath: string;
  buffer: Buffer;
  options: unknown;
};

type StorageDeleteCall = {
  bucketName: string;
  objectPath: string;
  options: unknown;
};

let currentUserUid = "user-1";
let onAddMealPayload: (payload: unknown) => Promise<{ id: string }> = async () => ({
  id: "meal-1",
});
let onStorageSave: (call: StorageSaveCall) => Promise<void> = async () => undefined;
let onStorageDelete: (call: StorageDeleteCall) => Promise<void> = async () => undefined;
let onReadMealImagePreview: (file: File) => Promise<string> = async () => "blob:preview";
let onRevokeMealImagePreview: (previewUrl: string | null | undefined) => void = () => {};

const mockModuleOptions = (exports: Record<string, unknown>) =>
  ({ exports }) as unknown as Parameters<typeof mock.module>[1];

mock.module("@/lib/config/server-env", {
  ...mockModuleOptions({
    serverEnv: TEST_SERVER_ENV,
  }),
});

mock.module("@/lib/firebase-admin", {
  ...mockModuleOptions({
    adminDb: {
      collection: () => ({
        add: (payload: unknown) => onAddMealPayload(payload),
      }),
    },
    adminStorage: {
      bucket: (bucketName: string) => ({
        file: (objectPath: string) => ({
          save: (buffer: Buffer, options: unknown) =>
            onStorageSave({ bucketName, objectPath, buffer, options }),
          delete: (options: unknown) =>
            onStorageDelete({ bucketName, objectPath, options }),
        }),
      }),
    },
  }),
});

mock.module("@/lib/server/route-auth", {
  ...mockModuleOptions({
    requireVerifiedUser: async () => ({ uid: currentUserUid }),
  }),
});

mock.module("@/lib/meal-form", {
  ...mockModuleOptions({
    readMealImagePreview: (file: File) => onReadMealImagePreview(file),
    revokeMealImagePreview: (previewUrl: string | null | undefined) =>
      onRevokeMealImagePreview(previewUrl),
  }),
});

const importFresh = async <T,>(specifier: string): Promise<T> =>
  import(`${specifier}?test=${Date.now()}-${Math.random()}`) as Promise<T>;

const createPngBuffer = (width: number, height: number): Promise<Buffer> =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 220, g: 80, b: 60 },
    },
  })
    .png()
    .toBuffer();

const resetTestHandlers = () => {
  currentUserUid = "user-1";
  onAddMealPayload = async () => ({ id: "meal-1" });
  onStorageSave = async () => undefined;
  onStorageDelete = async () => undefined;
  onReadMealImagePreview = async () => "blob:preview";
  onRevokeMealImagePreview = () => {};
};

afterEach(() => {
  resetTestHandlers();
});

test("createMealDocument rejects image URLs outside the caller upload prefix", async () => {
  const addedPayloads: unknown[] = [];
  onAddMealPayload = async (payload: unknown) => {
    addedPayloads.push(payload);
    return { id: "meal-1" };
  };

  const { createMealDocument } = await importFresh<typeof import("../lib/server/meals/meal-write-use-cases.ts")>(
    "../lib/server/meals/meal-write-use-cases.ts"
  );

  await assert.rejects(
    () =>
      createMealDocument({
        uid: "user-1",
        actorRole: "아빠",
        input: {
          userIds: ["아빠"],
          description: "외부 이미지 차단",
          type: "점심",
          imageUrl: "https://example.com/raw-photo.jpg",
          timestamp: 1_710_000_000_000,
        },
      }),
    /Invalid meal image URL/
  );

  assert.equal(addedPayloads.length, 0);
});

test("upload route parses multipart input and stores normalized JPEG output", async () => {
  const savedFiles: StorageSaveCall[] = [];
  onStorageSave = async (call) => {
    savedFiles.push(call);
  };

  const { POST } = await importFresh<typeof import("../app/api/uploads/meal-image/route.ts")>(
    "../app/api/uploads/meal-image/route.ts"
  );

  const inputBuffer = await createPngBuffer(2400, 1200);
  const uploadBytes = Uint8Array.from(inputBuffer);
  const formData = new FormData();
  formData.append(
    "file",
    new File([uploadBytes.buffer], "meal.png", { type: "image/png" })
  );

  const response = await POST(
    new Request("http://localhost/api/uploads/meal-image", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
      },
      body: formData,
    })
  );

  assert.equal(response.status, 200);

  const payload = (await response.json()) as { ok?: boolean; imageUrl?: string; path?: string };
  assert.equal(payload.ok, true);
  assert.match(payload.imageUrl ?? "", /firebasestorage\.googleapis\.com/);
  assert.match(payload.path ?? "", /^meals\/user-1\/.+\.jpg$/);
  assert.equal(savedFiles.length, 1);
  assert.equal(savedFiles[0]?.bucketName, TEST_BUCKET);
  assert.equal(savedFiles[0]?.objectPath, payload.path);

  const metadata = await sharp(savedFiles[0]!.buffer).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 800);
});

test("upload route exposes authenticated cleanup for uploaded meal images", async () => {
  const deletedPaths: string[] = [];
  onStorageDelete = async ({ bucketName, objectPath }) => {
    deletedPaths.push(`${bucketName}:${objectPath}`);
  };

  const uploadRoute = await importFresh<typeof import("../app/api/uploads/meal-image/route.ts")>(
    "../app/api/uploads/meal-image/route.ts"
  );

  assert.equal(typeof uploadRoute.DELETE, "function");

  const response = await uploadRoute.DELETE!(
    new Request("http://localhost/api/uploads/meal-image", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer test-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        imageUrl:
          "https://firebasestorage.googleapis.com/v0/b/family-meal.appspot.com/o/meals%2Fuser-1%2Fcleanup.jpg?alt=media&token=test-token",
      }),
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(deletedPaths, [`${TEST_BUCKET}:meals/user-1/cleanup.jpg`]);
});

test("useMealImageSelection manages preview lifecycle for local files", async () => {
  const revokedPreviews: string[] = [];
  const nextPreviews = ["blob:preview-1", "blob:preview-2"];

  onReadMealImagePreview = async () => nextPreviews.shift() ?? "blob:fallback";
  onRevokeMealImagePreview = (previewUrl) => {
    if (previewUrl) {
      revokedPreviews.push(previewUrl);
    }
  };

  const { useMealImageSelection } = await importFresh<
    typeof import("../components/hooks/useMealImageSelection.ts")
  >("../components/hooks/useMealImageSelection.ts");

  type MealImageSelection = ReturnType<typeof useMealImageSelection>;

  let imageSelection: MealImageSelection | null = null;

  const Harness = () => {
    imageSelection = useMealImageSelection();
    return null;
  };

  let renderer: TestRenderer.ReactTestRenderer | null = null;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Harness));
  });

  const getSelection = (): MealImageSelection => {
    assert.ok(imageSelection);
    return imageSelection;
  };

  const firstFile = new File([new Uint8Array([97])], "first.jpg", { type: "image/jpeg" });
  const secondFile = new File([new Uint8Array([98])], "second.png", { type: "image/png" });

  let firstResult: Awaited<ReturnType<MealImageSelection["selectFile"]>> | null = null;
  await act(async () => {
    firstResult = await getSelection().selectFile(firstFile);
  });

  assert.deepEqual(firstResult, { ok: true });
  assert.equal(getSelection().imageFile, firstFile);
  assert.equal(getSelection().imagePreview, "blob:preview-1");
  assert.equal(getSelection().localImageSummary, "JPG · 1KB");

  await act(async () => {
    await getSelection().selectFile(secondFile);
  });

  assert.equal(getSelection().imageFile, secondFile);
  assert.equal(getSelection().imagePreview, "blob:preview-2");
  assert.deepEqual(revokedPreviews, ["blob:preview-1"]);

  await act(async () => {
    renderer!.unmount();
  });

  assert.deepEqual(revokedPreviews, ["blob:preview-1", "blob:preview-2"]);
});
