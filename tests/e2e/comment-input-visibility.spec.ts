import { expect, test } from "@playwright/test";

test("comment input stays readable on mobile even when system theme is dark", async ({ page }) => {
  await page.goto("/");

  await page.evaluate(() => {
    const sandbox = document.createElement("div");
    sandbox.id = "comment-input-sandbox";
    sandbox.innerHTML = `
      <input
        data-testid="qa-comment-input"
        type="text"
        placeholder="댓글을 입력하세요"
        class="input-base input-pill comment-input"
        style="padding:8px 12px; font-size:0.84rem; outline:none; width:280px;"
      />
    `;
    document.body.appendChild(sandbox);
  });

  const commentInput = page.getByTestId("qa-comment-input");
  await expect(commentInput).toBeVisible();

  await commentInput.fill("가독성 확인");

  const bodyBackground = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
  expect(bodyBackground).toBe("rgb(250, 250, 245)");

  const styles = await commentInput.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    const placeholder = window.getComputedStyle(element, "::placeholder");
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      caretColor: computed.caretColor,
      borderColor: computed.borderColor,
      placeholderColor: placeholder.color,
    };
  });

  expect(styles.color).not.toBe(styles.backgroundColor);
  expect(styles.placeholderColor).not.toBe(styles.backgroundColor);
  expect(styles.caretColor).toBe(styles.color);
  expect(styles.borderColor).not.toBe(styles.backgroundColor);
});
