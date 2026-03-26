import { expect, test, type Page } from "@playwright/test";

const parseRgb = (value: string): [number, number, number] => {
  const matches = value.match(/\d+(\.\d+)?/g);
  if (!matches || matches.length < 3) {
    throw new Error(`Failed to parse RGB value: ${value}`);
  }
  return [Number(matches[0]), Number(matches[1]), Number(matches[2])];
};

const getLuminance = ([r, g, b]: [number, number, number]): number => {
  const normalize = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
};

const getContrastRatio = (foreground: string, background: string): number => {
  const fg = getLuminance(parseRgb(foreground));
  const bg = getLuminance(parseRgb(background));
  const [light, dark] = fg > bg ? [fg, bg] : [bg, fg];
  return (light + 0.05) / (dark + 0.05);
};

const enableQaMockMode = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("familymeal:qa-mock-mode", "true");
  });
};

test("comment input stays readable on mobile even when system theme is dark", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  const toggleButton = page.getByTestId("meal-card-qa-home-meal").getByTestId("meal-card-comment-toggle");
  await expect(toggleButton).toBeVisible();
  await toggleButton.click();

  const commentInput = page.getByTestId("meal-card-comment-input");
  await expect(commentInput).toBeVisible();

  await commentInput.fill("readability check");

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

  const textContrast = getContrastRatio(styles.color, styles.backgroundColor);
  const placeholderContrast = getContrastRatio(styles.placeholderColor, styles.backgroundColor);

  expect(textContrast).toBeGreaterThanOrEqual(4.5);
  expect(placeholderContrast).toBeGreaterThanOrEqual(3);
});

test("home requires login when qa mock mode is not enabled", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("meal-card-comment-toggle")).toHaveCount(0);
});

test("logout clears qa mock session", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  await expect(page.getByTestId("meal-card-comment-toggle").first()).toBeVisible();

  await page.getByTestId("home-logout-button").click();
  await expect(page.getByTestId("meal-card-comment-toggle")).toHaveCount(0);
});

test("qa mock mode can add comments without auth", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  const toggleButton = page.getByTestId("meal-card-qa-home-meal").getByTestId("meal-card-comment-toggle");
  await expect(toggleButton).toBeVisible();
  await toggleButton.click();

  const commentInput = page.getByTestId("meal-card-comment-input");
  await expect(commentInput).toBeVisible();
  await expect(page.locator(".comment-item")).toHaveCount(1);

  await commentInput.fill("qa local add");
  await page.locator(".comment-send-btn").click();

  await expect(page.locator(".comment-item")).toHaveCount(2);
  await expect(page.locator(".comment-text").last()).toHaveText("qa local add");
  await expect(toggleButton).toContainText("댓글 2");
});

test("qa mock mode can toggle meal reactions locally", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  const mealReaction = page.getByTestId("meal-card-qa-home-meal").getByTestId("meal-reaction-chip-heart");
  await expect(mealReaction).toBeVisible();
  await expect(mealReaction).toContainText("1");

  await mealReaction.click();
  await expect(mealReaction).toContainText("2");
  await expect(mealReaction).toHaveAttribute("data-active", "true");

  await mealReaction.click();
  await expect(mealReaction).toContainText("1");
  await expect(mealReaction).toHaveAttribute("data-active", "false");
});

test("qa mock mode can toggle comment reactions locally", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  await page.getByTestId("meal-card-qa-home-meal").getByTestId("meal-card-comment-toggle").click();

  const commentReaction = page.getByTestId("comment-reaction-chip-heart");
  await expect(commentReaction).toBeVisible();
  await expect(commentReaction).toContainText("1");

  await commentReaction.click();
  await expect(commentReaction).toContainText("2");
  await expect(commentReaction).toHaveAttribute("data-active", "true");
});

test("qa mock mode shows activity summary and supports meal filters", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  await expect(page.getByTestId("activity-summary-card-comments")).toBeVisible();
  await expect(page.getByTestId("activity-summary-card-reactions")).toBeVisible();
  await expect(page.getByTestId("activity-alert-badge")).toBeVisible();

  await expect(page.locator(".meal-card")).toHaveCount(3);
  await page.getByTestId("filter-type-아침").click();
  await expect(page.locator(".meal-card")).toHaveCount(1);

  await page.getByTestId("filter-user-엄마").click();
  await expect(page.locator(".meal-card")).toHaveCount(0);

  await page.getByTestId("filter-type-전체").click();
  await expect(page.locator(".meal-card")).toHaveCount(1);
});

test("qa mock mode can add a reply with auto mention context", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  await page.getByTestId("meal-card-qa-home-meal").getByTestId("meal-card-comment-toggle").click();
  await page.getByTestId("comment-reply-button-qa-home-comment").click();

  await expect(page.getByTestId("comment-reply-target")).toContainText("아빠님께 답글");

  const commentInput = page.getByTestId("meal-card-comment-input");
  await commentInput.fill("답글 테스트");
  await page.locator(".comment-send-btn").click();

  await expect(page.locator(".comment-thread-reply")).toHaveCount(1);
  await expect(page.locator(".comment-thread-reply .comment-text")).toContainText("답글 테스트");
  await expect(page.locator(".comment-mention")).toContainText("아빠님께 답글");
});
