describe("Sistema de traducao", () => {
  const pt = {
    appName: "Palhinha",
    titleFragment: "Acompanhe os álbuns de musicais",
    primaryAction: "Criar conta",
    secondaryAction: "Entrar",
    languageLabel: "Escolher idioma",
  };

  const en = {
    titleFragment: "Track the cast albums you love",
    primaryAction: "Create Account",
    secondaryAction: "Sign In",
    languageLabel: "Choose language",
  };

  const languageSwitcherSelector = '[role="group"]';

  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        // Mantem o teste deterministico mesmo se o navegador do Cypress tiver outro idioma.
        win.localStorage.setItem("i18nextLng", "pt");
      },
    });
  });

  it("troca o idioma da interface e preserva a escolha apos reload", () => {
    // Ajuste os seletores abaixo se a estrutura visual do landing page mudar.
    cy.contains("p", pt.appName).should("be.visible");
    cy.contains("h1", pt.titleFragment).should("be.visible");
    cy.contains("a", pt.primaryAction).should("be.visible");
    cy.contains("a", pt.secondaryAction).should("be.visible");
    cy.get(languageSwitcherSelector)
      .should("be.visible")
      .and("have.attr", "aria-label", pt.languageLabel);

    cy.get(languageSwitcherSelector)
      .contains("button", "EN")
      .should("be.visible")
      .click();

    cy.get(languageSwitcherSelector)
      .should("have.attr", "aria-label", en.languageLabel)
      .within(() => {
        cy.contains("button", "EN").should("have.attr", "aria-pressed", "true");
      });

    cy.contains("h1", en.titleFragment).should("be.visible");
    cy.contains("a", en.primaryAction).should("be.visible");
    cy.contains("a", en.secondaryAction).should("be.visible");

    cy.reload();

    cy.get(languageSwitcherSelector)
      .should("have.attr", "aria-label", en.languageLabel)
      .within(() => {
        cy.contains("button", "EN").should("have.attr", "aria-pressed", "true");
      });

    cy.contains("h1", en.titleFragment).should("be.visible");
    cy.contains("a", en.primaryAction).should("be.visible");
    cy.contains("a", en.secondaryAction).should("be.visible");
  });
});
