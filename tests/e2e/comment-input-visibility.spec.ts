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

  const toggleButton = page.getByTestId("meal-card-comment-toggle");
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

  await expect(page.getByTestId("meal-card-comment-toggle")).toBeVisible();

  await page.getByTestId("home-logout-button").click();
  await expect(page.getByTestId("meal-card-comment-toggle")).toHaveCount(0);
});
