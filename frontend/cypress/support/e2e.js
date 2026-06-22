/* global Cypress, cy */

// Place custom Cypress commands or global setup here if the suite needs them later.

Cypress.Commands.add("login", (email, password) => {
  // Limpa estado de autenticação anterior para evitar redirecionamento automático
  cy.clearCookies();
  cy.clearLocalStorage();

  cy.visit("/login", {
    onBeforeLoad(win) {
      win.localStorage.setItem("i18nextLng", "pt");
    },
  });
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  // Garante que o login foi realizado e redirecionado para a aplicação principal
  cy.url().should("include", "/app");
});
