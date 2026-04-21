import { DialogComponent } from '@theme/dialog';
import { CartAddEvent } from '@theme/events';
import { morphSection, sectionRenderer } from '@theme/section-renderer';

/**
 * A custom element that manages a cart drawer.
 *
 * @extends {DialogComponent}
 */
class CartDrawerComponent extends DialogComponent {
  /** @type {boolean} Whether the cart section has been updated since page load */
  #sectionDirty = false;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(CartAddEvent.eventName, this.#handleCartAdd);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(CartAddEvent.eventName, this.#handleCartAdd);
  }

  #handleCartAdd = (event) => {
    const sections = event.detail?.data?.sections;
    const sectionId = this.#getCartSectionId();

    if (sectionId && sections?.[sectionId]) {
      // Fast path: morph directly with the section HTML from the add-to-cart response
      morphSection(sectionId, sections[sectionId]);
      this.#sectionDirty = true;
    } else if (sectionId) {
      // Fallback: fetch fresh section HTML
      sectionRenderer.renderSection(sectionId, { cache: false }).then(() => {
        this.#sectionDirty = true;
      });
    }

    if (this.hasAttribute('auto-open')) {
      this.showDialog();
    }
  };

  open() {
    // Always refresh cart content when manually opening the drawer
    // This ensures the drawer shows current cart state even after page navigation
    this.#refreshCartSection();
    this.showDialog();

    /**
     * Close cart drawer when installments CTA is clicked to avoid overlapping dialogs
     */
    customElements.whenDefined('shopify-payment-terms').then(() => {
      const installmentsContent = document.querySelector('shopify-payment-terms')?.shadowRoot;
      const cta = installmentsContent?.querySelector('#shopify-installments-cta');
      cta?.addEventListener('click', this.closeDialog, { once: true });
    });
  }

  close() {
    this.closeDialog();
  }

  /**
   * Fetches and renders fresh cart section HTML.
   */
  #refreshCartSection() {
    const sectionId = this.#getCartSectionId();
    if (sectionId) {
      sectionRenderer.renderSection(sectionId, { cache: false });
    }
  }

  /**
   * Gets the section ID from the cart-items-component inside this drawer.
   * @returns {string | undefined}
   */
  #getCartSectionId() {
    return this.querySelector('cart-items-component')?.dataset?.sectionId;
  }
}

if (!customElements.get('cart-drawer-component')) {
  customElements.define('cart-drawer-component', CartDrawerComponent);
}
