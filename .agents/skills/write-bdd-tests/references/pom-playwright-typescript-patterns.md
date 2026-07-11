Several design patterns are commonly used alongside the **Page Object Model (POM)** to make test automation frameworks more maintainable, scalable, and reusable.
Below are the most widely used patterns with examples.

---

## 1. Page Object Pattern

Each page is represented by a class that encapsulates its locators and actions.

**Example**

```typescript
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  private username = this.page.getByLabel('Username');
  private password = this.page.getByLabel('Password');
  private loginButton = this.page.getByRole('button', { name: 'Login' });

  async login(username: string, password: string) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.loginButton.click();
  }
}
```

---

## 2. Page Component (Composition) Pattern

Reusable UI components are extracted into their own classes.

```typescript
import { Page } from '@playwright/test';

export class HeaderComponent {
  constructor(private readonly page: Page) {}

  private searchBox = this.page.getByPlaceholder('Search');

  async search(term: string) {
    await this.searchBox.fill(term);
    await this.searchBox.press('Enter');
  }
}
```

```typescript
import { Page } from '@playwright/test';
import { HeaderComponent } from './HeaderComponent';

export class HomePage {
  readonly header: HeaderComponent;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);
  }
}
```

Usage

```typescript
const home = new HomePage(page);

await home.header.search('Laptop');
```

---

## 3. Fluent Interface Pattern

Methods return the page object to enable method chaining.

```typescript
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async enterUsername(username: string): Promise<this> {
    await this.page.getByLabel('Username').fill(username);
    return this;
  }

  async enterPassword(password: string): Promise<this> {
    await this.page.getByLabel('Password').fill(password);
    return this;
  }

  async login() {
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
```

Usage

```typescript
await new LoginPage(page)
  .enterUsername('admin')
  .then(page => page.enterPassword('password'))
  .then(page => page.login());
```

> Because Playwright methods are asynchronous, fluent APIs are less elegant than in synchronous languages like Java. Many teams instead prefer a single `login()` method.

---

## 4. Factory Pattern

Creates page objects from one place.

```typescript
import { Page } from '@playwright/test';

export class Pages {
  constructor(private readonly page: Page) {}

  get login() {
    return new LoginPage(this.page);
  }

  get home() {
    return new HomePage(this.page);
  }
}
```

Usage

```typescript
const pages = new Pages(page);

await pages.login.login('admin', 'password');
```

---

## 5. Base Page Pattern

Common Playwright functionality is shared through inheritance.

```typescript
import { Locator, Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  protected async click(locator: Locator) {
    await locator.click();
  }

  protected async fill(locator: Locator, value: string) {
    await locator.fill(value);
  }

  protected async waitFor(locator: Locator) {
    await locator.waitFor();
  }
}
```

```typescript
export class LoginPage extends BasePage {
  async login(username: string, password: string) {
    await this.fill(this.page.getByLabel('Username'), username);
    await this.fill(this.page.getByLabel('Password'), password);
    await this.click(this.page.getByRole('button', { name: 'Login' }));
  }
}
```

---

## 6. Loadable Page Pattern

Ensures the page is ready before interaction.

```typescript
export class HomePage {
  constructor(private readonly page: Page) {}

  async waitUntilLoaded() {
    await this.page.getByRole('heading', {
      name: 'Welcome',
    }).waitFor();
  }
}
```

Usage

```typescript
const home = new HomePage(page);

await home.waitUntilLoaded();
```

---

## 7. Singleton Pattern (Shared Service)

Playwright already provides a fresh `page` fixture for each test, so a WebDriver singleton is generally unnecessary. Instead, singleton patterns are more commonly used for shared services.

```typescript
export class Config {
  private static instance: Config;

  readonly baseUrl = 'https://example.com';

  private constructor() {}

  static getInstance() {
    if (!Config.instance) {
      Config.instance = new Config();
    }

    return Config.instance;
  }
}
```

Usage

```typescript
const config = Config.getInstance();

await page.goto(config.baseUrl);
```

---

## 8. Builder Pattern (Test Data)

```typescript
interface User {
  firstName: string;
  lastName: string;
  email: string;
}

class UserBuilder {
  private user: User = {
    firstName: '',
    lastName: '',
    email: '',
  };

  withFirstName(name: string) {
    this.user.firstName = name;
    return this;
  }

  withLastName(name: string) {
    this.user.lastName = name;
    return this;
  }

  withEmail(email: string) {
    this.user.email = email;
    return this;
  }

  build(): User {
    return this.user;
  }
}
```

Usage

```typescript
const user = new UserBuilder()
  .withFirstName('John')
  .withLastName('Smith')
  .withEmail('john@example.com')
  .build();
```

---

## 9. Strategy Pattern

Different implementations can be swapped without changing the calling code.

```typescript
interface PaymentStrategy {
  pay(): Promise<void>;
}

class CreditCardPayment implements PaymentStrategy {
  async pay() {
    console.log('Paying with credit card');
  }
}

class PayPalPayment implements PaymentStrategy {
  async pay() {
    console.log('Paying with PayPal');
  }
}
```

Usage

```typescript
const payment: PaymentStrategy = new PayPalPayment();

await payment.pay();
```

---

## 10. Facade Pattern

Provides a simplified interface for a multi-page workflow.

```typescript
export class CheckoutFacade {
  constructor(private readonly page: Page) {}

  async purchase(username: string, password: string) {
    const login = new LoginPage(this.page);
    const cart = new CartPage(this.page);
    const checkout = new CheckoutPage(this.page);

    await login.login(username, password);
    await cart.checkout();
    await checkout.placeOrder();
  }
}
```

Usage

```typescript
const checkout = new CheckoutFacade(page);

await checkout.purchase('admin', 'password');
```

## Notes for Playwright

Some patterns common elsewhere are less relevant in Playwright:

* **Singleton WebDriver** is unnecessary because Playwright Test manages browser, context, and page lifecycles through fixtures.
* **Explicit wait utilities** are often unnecessary since Playwright automatically waits for elements to become actionable.
* **Fluent Interface Pattern** are less elegant because Playwright methods are asynchronous, prefere a single method with mutiple arguments.

In practice, a modern Playwright framework typically combines **Page Objects**, **Page Components (Composition)**, **Base Page** (sparingly), **Builder** for test data, and **Facade** for complex business workflows. **Auto-scroll (pattern #11) is mandatory in this project** — see the `pom-writer` agent definition.

---

## 11. Active-Component Visibility (Auto-Scroll) Pattern

Every public action method in a Page Object calls `scrollIntoViewIfNeeded()` on the target locator before the actual interaction. This is **mandatory** in the project's `document-bdd-feature` recording workflow — without it, form fields below the fold at 1280x720 are not visible in the recording until the browser auto-scrolls on the first interaction, which produces a misleading "form appears suddenly when the submit button is clicked" artifact in the demo video.

The pattern is idempotent (Playwright skips the scroll if the element is already in viewport) and adds one line per method.

**Example**

```typescript
import { type Page } from '@playwright/test';

import { <Feature>Locators } from './<Feature>Locators';

export class <Feature>Page {
  readonly locators: <Feature>Locators;
  constructor(private readonly page: Page) {
    this.locators = new <Feature>Locators(page);
  }

  async pickProvider(provider: 'ollama' | 'openai-compatible') {
    // Auto-scroll so the field is on-screen BEFORE the recording-driven
    // test interaction. Without this, the field jumps into view only
    // when the browser auto-scrolls for the first interaction.
    await this.locators.providerSelect.scrollIntoViewIfNeeded();
    await this.locators.providerSelect.selectOption(provider);
  }

  async pickModel(value: string) {
    await this.locators.modelSelect.scrollIntoViewIfNeeded();
    await this.locators.modelSelect.selectOption(value);
  }

  async submit() {
    await this.locators.submitButton.scrollIntoViewIfNeeded();
    await this.locators.submitButton.click();
  }
}
```

**Why this is a pattern, not just a "scroll" line**

* **Idempotent** — calling `scrollIntoViewIfNeeded` on an already-visible element is a no-op; safe to invoke on every action.
* **Plays nicely with the recording** — the video shows the field being selected from a stable, visible position; reviewers can actually see the field.
* **Preserves test fidelity** — `selectOption`, `click`, `fill` are all atomic; the auto-scroll is the only added work, and Playwright's actionability check still fires (so the test would still fail if the element were not interactable).
* **Backwards-compatible** — tests that already passed continue to pass (verified in plan 02.1-04 + this skill update; 20/20 @web tests still pass after the auto-scroll retrofit).
