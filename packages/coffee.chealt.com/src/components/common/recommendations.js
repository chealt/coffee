class Recommendations extends HTMLElement {
  connectedCallback() {
    this.canRecommendElements = this.querySelectorAll('[data-recommendation-key]');
    this.recommendationsURL = this.dataset.recommendationsUrl;

    if (!this.recommendationsURL) {
      throw new Error('Missing recommendations URL, please add data attribute: `data-recommendations-url`');
    }

    this.loadRecommendations.bind(this)();
  }

  async loadRecommendations() {
    const recommendationsResponse = await fetch(this.recommendationsURL);

    if (!recommendationsResponse.ok) {
      throw new Error('Could not load recommendations');
    }

    const { recommendations } = await recommendationsResponse.json();

    if (!recommendations) {
      throw new Error('Could not load recommendations');
    }

    Object.keys(recommendations).forEach((key) => {
      const recommendation = recommendations[key];

      recommendation.forEach((rec) => {
        this.querySelectorAll(`[data-recommendation-key="${key}-${typeof rec === 'object' ? rec.id : rec}"]`)?.forEach(
          (recommendedElement) => {
            recommendedElement.classList.remove('hidden');
          }
        );
      });
    });
  }
}

if (!customElements.get('coffee-recommendations')) {
  customElements.define('coffee-recommendations', Recommendations);
}
