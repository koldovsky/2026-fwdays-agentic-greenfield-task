
# Introduction

The **Page Object Model (POM)** is a test automation design pattern that organizes UI interactions into dedicated page classes, separating test logic from page implementation details. This improves the readability, reusability, and maintainability of automated tests.

# Key POM Principles

* **Single Responsibility**: Each page object represents one page, screen, or significant UI component and encapsulates its behavior.
* **Encapsulation**: Keep locators and UI interaction logic inside page objects, hiding implementation details from tests.
* **Separation of Concerns**: Test cases focus on business workflows and assertions, while page objects handle UI interactions.
* **Reusability**: Common actions (such as logging in or filling forms) are implemented once and reused across multiple tests.
* **Maintainability**: UI changes typically require updates only in the affected page object rather than across many tests.
* **Readability**: Expose clear, business-oriented methods (for example, `login()` or `searchForProduct()`) instead of low-level UI operations.
* **Minimal Assertions in Page Objects**: Keep verification logic primarily in test cases; page objects should mainly model interactions and state access.
* **Composition Over Duplication**: Represent reusable UI components (such as navigation bars, headers, or dialogs) as separate component objects that page objects can compose.
* **Stable Public API**: Design page object methods to remain consistent even if underlying locators or interaction details change.
* **Synchronization**: Handle waiting for elements or page state within page objects to reduce flaky tests and keep test code clean.
* **Active-component visibility (auto-scroll) — MANDATORY in this project**: every public action method on a Page Object MUST call `scrollIntoViewIfNeeded()` on the target locator before the actual interaction. This is required by the `document-bdd-feature` skill (recording at 1280x720) — without auto-scroll, form fields below the fold jump into view only on the first interaction, producing a misleading recording. See pattern #11 in `pom-playwright-typescript-patterns.md` for the canonical implementation; the `pom-writer` agent enforces this rule.

# Locator Strategy

A good locator strategy prioritizes user-visible semantics, stability, and maintainability over implementation details.

1. Prefer user-facing locators: locate elements the way a user perceives them, rather than how they're implemented.
2. Follow this general order of preference:

| Priority | Locator              | Use Case                                       |
| -------- | -------------------- | ---------------------------------------------- |
| ⭐⭐⭐⭐⭐    | `getByRole()`        | Buttons, links, inputs, menus, tables          |
| ⭐⭐⭐⭐⭐    | `getByLabel()`       | Form controls                                  |
| ⭐⭐⭐⭐☆    | `getByPlaceholder()` | Inputs without labels                          |
| ⭐⭐⭐⭐☆    | `getByText()`        | Static visible text                            |
| ⭐⭐⭐☆☆    | `getByAltText()`     | Images                                         |
| ⭐⭐⭐☆☆    | `getByTitle()`       | Tooltips or titled elements                    |
| ⭐⭐⭐☆☆    | `getByTestId()`      | Elements without good semantic attributes      |
| ⭐☆☆☆☆    | CSS selectors        | Only when necessary                            |
| ❌        | XPath                | Avoid unless there is no practical alternative |

3. Use test IDs for non-user-visible elements

Some elements simply don't have good accessible attributes.

Examples:

* loading spinners
* icons
* charts
* custom widgets
* hidden controls

```html
<button data-testid="save-button">
```

```typescript
page.getByTestId('save-button')
```

4. Avoid styling-based locators

Never rely on CSS classes used for styling.

Bad

```typescript
page.locator('.btn-green')
page.locator('.css-1q7x3ab')
```

CSS frameworks frequently rename classes.

5. Avoid brittle DOM traversal

Bad

```typescript
page.locator('div > div:nth-child(3) > button')
```

A small layout change breaks the test.

Instead

```typescript
page.getByRole('button', { name: 'Delete' })
```

6. Use descriptive locator names

Good

```typescript
private saveButton
private searchInput
private orderTable
private deleteDialog
```

Avoid

```typescript
private btn1
private field
private input2
```

## Locator Class Example

```typescript
import { Locator, Page } from '@playwright/test';

export class <Feature>Locators {
  constructor(page: Page) {
    super(page);
    this.locatorInitialization();
  }

  // Static locators
  btn<Action>!: Locator;
  msg<Outcome>!: Locator;

  // Dynamic locators (parameterized)
  rowProduct!: (productName: string) => Locator;
  inputQuantity!: (productName: string) => Locator;

  locatorInitialization(): void {
    super.locatorInitialization();
    this.btn<Action> = this.page.getByRole('button', { name: '<Name>' });
    this.msg<Outcome> = this.page.locator('//div[contains(@class,"alert-success")]');
    this.rowProduct = (productName: string) =>
      this.page.locator(`//tr[.//a[normalize-space()="${productName}"]]`);
    this.inputQuantity = (productName: string) =>
      this.rowProduct(productName).locator('input[name^="quantity"]');
  }
}
```

# Page Object Guidelines

- **Two-class layering:** Locators live in `playwright/locators/<feature>-locators.ts` as a `<Feature>Locators` class and the corresponding page class `<Feature>Page` lives in `playwright/pages/<feature>-page.ts` and **extends `<Feature>Locators`**.
- **Path aliases:** Use `@locators/*`, `@pages/*`, `@utilities/*`, `@models/*`, `@data/*`. No relative imports across folders.
- **No raw selectors in the page class.** All `Locator` instances must be declared and initialized in the locator class.
- **Decorators:** Every public action method on a page class is annotated with `@step('<human readable>')`. Include argument values when appropriate using string interpolation. If the decorator is not yet available in the repo, add it as `playwright/logging-utils.ts`.

## Page Object Class Example

```typescript
import { Page } from '@playwright/test';
import { CommonPage } from '@pages/common-page';
import { AssertHelper } from '@pages/assert-helper-page';
import { <Feature>Locators } from '@locators/<feature>-locators';
import { step } from '@utilities/logging';
import { Messages } from '@data/messages.data';
import { <Model> } from '@models/<model>';

export class <Feature>Page extends <Feature>Locators {
  constructor(page: Page) {
    super(page);
  }

  @step('<Action description>')
  async <action>(input: <Model>): Promise<void> {
    await this.commonPage.click(this.btn<Action>);
    // never call expect() here — verifications go in verify*/expect* methods
  }

  @step('Verify <outcome>')
  async verify<Outcome>(expectedMessage: string = Messages.<KEY>): Promise<void> {
    await this.assertHelper.assertElementContainsText(
      this.msg<Outcome>,
      expectedMessage,
      '<role-aware label>',
    );
  }
}
```

## Sample step Decorator Implementation

```typescript
import { test } from "@playwright/test";

type Method<This, Args extends unknown[], Return> = (
  this: This,
  ...args: Args
) => Promise<Return>;

type MethodDecoratorContext<
  This,
  Args extends unknown[],
  Return,
> = ClassMethodDecoratorContext<This, Method<This, Args, Return>>;

function extractParams(fn: Function): string[] {
  const fnStr = fn.toString();
  const argsMatch = fnStr.match(/\(([^)]*)\)/);

  if (!argsMatch?.[1]) return [];

  return argsMatch[1]
    .split(",")
    .map(param => param.trim())
    .filter(Boolean)
    .map(param => param.replace(/=.*$/, "").trim())
    .map(param => param.replace(/^\.\.\./, "").trim());
}

function interpolateParams<Args extends unknown[]>(
  message: string,
  fn: Function,
  args: Args
): string {
  const paramNames = extractParams(fn);

  return message.replace(/\{\{(\w+)\}\}/g, (_, paramName) => {
    const index = paramNames.indexOf(paramName);
    if (index === -1 || index >= args.length) return `{{${paramName}}}`;

    const value = args[index];
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  });
}

export function step<
  This extends { constructor: { name: string } },
  Args extends unknown[],
  Return,
>(message?: string) {
  return (
    value: Method<This, Args, Return>,
    context: MethodDecoratorContext<This, Args, Return>
  ) => {
    const target = value;
    const name = context.name ?? "unknown";

    function replacementMethod(
      this: This,
      ...args: Args
    ): Promise<Return> {
      const defaultName = `${this.constructor.name}.${String(name)}`;
      const stepName = message
        ? interpolateParams(message, target, args)
        : defaultName;

      return test.step(stepName, async () => {
        return await target.call(this, ...args);
      });
    }

    return replacementMethod as Method<This, Args, Return>;
  };
}
```
