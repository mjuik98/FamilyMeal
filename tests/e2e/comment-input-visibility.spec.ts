import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

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

const openQaMealDetail = async (page: Page) => {
  await page.goto("/");
  const openButton = page.getByTestId("meal-preview-open-qa-home-meal");
  await expect(openButton).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/meals\/qa-home-meal/, { timeout: 15_000 }),
    openButton.click(),
  ]);
  await expect(page.getByTestId("meal-detail-screen")).toBeVisible();
};

const ensureCommentsOpen = async (page: Page) => {
  const toggleButton = page
    .getByTestId("meal-card-qa-home-meal")
    .getByTestId("meal-card-comment-toggle");
  await expect(toggleButton).toBeVisible();

  const closedState = toggleButton.getByText("열기");
  if (await closedState.count()) {
    await toggleButton.click();
  }

  await expect(page.getByTestId("meal-card-comment-input")).toBeVisible();
  return toggleButton;
};

const expectDockWithinViewport = async (page: Page, testId: string) => {
  const metrics = await page.getByTestId(testId).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      top: rect.top,
      height: rect.height,
      viewport: window.innerHeight,
    };
  });

  expect(metrics.height).toBeGreaterThan(0);
  expect(metrics.top).toBeGreaterThanOrEqual(0);
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewport);
};

test("comment input stays readable on mobile even when system theme is dark", async ({ page }) => {
  await enableQaMockMode(page);
  await openQaMealDetail(page);

  await ensureCommentsOpen(page);
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
  await expect(page.getByTestId("meal-preview-open-qa-home-meal")).toHaveCount(0);
});

test("logout clears qa mock session", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  await expect(page.getByTestId("meal-preview-open-qa-home-meal")).toBeVisible();

  await page.getByTestId("home-logout-button").click();
  await expect(page.getByTestId("meal-preview-open-qa-home-meal")).toHaveCount(0);
});

test("qa mock mode can add comments without auth", async ({ page }) => {
  await enableQaMockMode(page);
  await openQaMealDetail(page);

  const toggleButton = await ensureCommentsOpen(page);
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
  await openQaMealDetail(page);

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
  await openQaMealDetail(page);

  await ensureCommentsOpen(page);

  const commentReaction = page.getByTestId("comment-reaction-chip-heart");
  await expect(commentReaction).toBeVisible();
  await expect(commentReaction).toContainText("1");

  await commentReaction.click();
  await expect(commentReaction).toContainText("2");
  await expect(commentReaction).toHaveAttribute("data-active", "true");
});

test("qa mock mode shows weekly date journal and persistent dock", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  await expect(page.getByTestId("week-date-strip")).toBeVisible();
  await expect(page.getByTestId("home-calendar-toggle")).toBeVisible();
  await expect(page.locator('[data-testid^="meal-preview-card-"]')).toHaveCount(4);
  await expect(page.locator(".week-date-thumbnail")).toHaveCount(6);

  const selectedDay = page.locator('[data-testid^="week-date-button-"][data-active="true"]');
  await expect(selectedDay).toHaveCount(1);
  await expect(selectedDay).toHaveAttribute("data-has-meals", "true");
  await expect(page.locator('[data-testid^="week-date-button-"][data-has-meals="false"]').first()).toBeVisible();

  const dock = page.getByTestId("bottom-dock");
  await expect(dock).toBeVisible();
  await expect(page.getByTestId("bottom-dock-add")).toBeVisible();
  await expectDockWithinViewport(page, "bottom-dock");

  await expect(page.getByTestId("activity-feed")).toHaveCount(0);
  await expect(page.getByTestId("activity-summary-card-comments")).toHaveCount(0);
});

test("qa mock mode can add a reply with auto mention context", async ({ page }) => {
  await enableQaMockMode(page);
  await openQaMealDetail(page);

  await ensureCommentsOpen(page);
  await page.getByTestId("comment-reply-button-qa-home-comment").click();

  await expect(page.getByTestId("comment-reply-target")).toContainText("아빠님께 답글");

  const commentInput = page.getByTestId("meal-card-comment-input");
  await commentInput.fill("답글 테스트");
  await page.locator(".comment-send-btn").click();

  await expect(page.locator(".comment-thread-reply")).toHaveCount(1);
  await expect(page.locator(".comment-thread-reply .comment-text")).toContainText("답글 테스트");
  await expect(page.locator(".comment-mention")).toContainText("아빠님께 답글");
});

test("qa mock mode can switch days from the weekly journal", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  await page.getByTestId("home-calendar-toggle").click();
  await expect(page.locator(".react-calendar")).toBeVisible();

  const dayButtons = page.locator('[data-testid^="week-date-button-"]');
  const firstDay = dayButtons.first();
  const lastDay = dayButtons.last();

  await expect(firstDay).toHaveAttribute("data-active", "false");
  await lastDay.click();
  await expect(lastDay).toHaveAttribute("data-active", "true");
  await expect(page.locator('[data-testid^="meal-preview-card-"]')).toHaveCount(4);
  await firstDay.click();
  await expect(firstDay).toHaveAttribute("data-active", "true");
  await expect(page.locator('[data-testid^="meal-preview-card-"]')).toHaveCount(2);
});

test("qa mock mode archive supports search and filters", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/");

  await page.getByTestId("home-archive-link").click();
  await expect(page).toHaveURL(/\/archive/);
  await expect(page.getByTestId("archive-search-input")).toBeVisible();
  const archiveCards = page.locator('[data-testid^="meal-preview-card-"]');
  const initialCount = await archiveCards.count();
  expect(initialCount).toBeGreaterThan(3);
  await expect(page.getByTestId("archive-load-more")).toHaveCount(0);
  await expect(page.locator('[data-testid^="archive-group-"]').first()).toBeVisible();
  await expect(page.getByTestId("archive-suggestion-user-엄마")).toBeVisible();

  const snackFilter = page.getByTestId("archive-filter-type-간식");
  await snackFilter.click();
  await expect(snackFilter).toHaveClass(/chip-button-active/);
  await expect
    .poll(async () => {
      const types = await page.locator(".meal-preview-meta .type-pill").allTextContents();
      return types.length > 0 && types.every((type) => type === "간식");
    })
    .toBe(true);
  const snackCount = await archiveCards.count();
  expect(snackCount).toBeGreaterThan(0);
  expect(snackCount).toBeLessThan(initialCount);

  const momFilter = page.getByTestId("archive-filter-user-엄마");
  await momFilter.click();
  await expect(momFilter).toHaveClass(/chip-button-active/);
  await expect
    .poll(async () => {
      const cardTexts = await archiveCards.allTextContents();
      return cardTexts.length > 0 && cardTexts.every((text) => text.includes("엄마"));
    })
    .toBe(true);
  const momSnackCount = await archiveCards.count();
  expect(momSnackCount).toBeGreaterThan(0);
  expect(momSnackCount).toBeLessThanOrEqual(snackCount);

  await page.getByTestId("archive-search-input").fill("토스트");
  await expect(archiveCards).toHaveCount(0);
});

test("qa mock mode detail supports same-day photo rail navigation", async ({ page }) => {
  await enableQaMockMode(page);
  await openQaMealDetail(page);

  await expect(page.getByTestId("meal-photo-stage")).toBeVisible();
  await expect(page.locator('[data-testid^="meal-photo-rail-item-"]')).toHaveCount(4);

  const breakfastRailItem = page.getByTestId("meal-photo-rail-item-qa-breakfast-meal");
  await breakfastRailItem.click();

  await expect(page).toHaveURL(/\/meals\/qa-breakfast-meal/);
  await expect(breakfastRailItem).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("meal-detail-summary")).toContainText("토스트와 계란 아침");
});

test("qa mock mode can persist notification settings locally", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/profile");

  const browserToggle = page.getByTestId("profile-notification-toggle-browserEnabled");
  const reactionToggle = page.getByTestId("profile-notification-toggle-reactionAlerts");

  await expect(browserToggle).toHaveAttribute("data-active", "true");
  await expect(reactionToggle).toHaveAttribute("data-active", "true");

  await reactionToggle.click();
  await expect(reactionToggle).toHaveAttribute("data-active", "false");

  await page.goto("/");
  await page.goto("/profile");
  await expect(page.getByTestId("profile-notification-toggle-reactionAlerts")).toHaveAttribute("data-active", "false");
});

test("qa mock mode remembers add form defaults", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/add");

  const snackButton = page.getByTestId("add-meal-type-간식");
  const momButton = page.getByTestId("add-meal-user-엄마");
  const sonButton = page.getByTestId("add-meal-user-아들");

  await snackButton.click();
  await momButton.click();
  await sonButton.click();

  await page.goto("/");
  await page.goto("/add");

  await expect(page.getByTestId("add-meal-type-간식")).toHaveClass(/chip-button-active/);
  await expect(page.getByTestId("add-meal-user-엄마")).toHaveClass(/chip-button-active/);
  await expect(page.getByTestId("add-meal-user-아들")).toHaveClass(/chip-button-active/);
});

test("qa mock mode can quick save with auto description and return to the selected date", async ({ page }) => {
  await enableQaMockMode(page);
  await page.goto("/add");

  await page.getByTestId("add-meal-type-간식").click();
  await page.getByTestId("add-meal-user-엄마").click();
  await page.getByTestId("add-meal-user-아빠").click();
  await page.getByTestId("add-photo-input").setInputFiles({
    name: "quick-meal.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl9Mh0AAAAASUVORK5CYII=",
      "base64"
    ),
  });

  await page.getByTestId("add-quick-save").click();

  await expect(page).toHaveURL(/\/\?date=/);
  await expect(page.locator('[data-testid^="meal-preview-card-"]')).toHaveCount(5);
  await expect(page.getByText("엄마와 함께한 간식 기록")).toBeVisible();
});
