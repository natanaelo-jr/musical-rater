/* global describe, beforeEach, it, cy */
describe("Fluxo de Autenticação", () => {
  const password = "Password123!";
  // Gerando um email único a cada execução para evitar conflito de e-mail existente.
  const email = `cypress_user_${Date.now()}@example.com`;
  const displayName = "Cypress Test User";

  beforeEach(() => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("i18nextLng", "pt");
      },
    });
  });

  it("permite registrar um novo usuário, deslogar e logar novamente", () => {
    // 1. Registro
    cy.contains("a", "Criar conta").should("be.visible").click();
    cy.url().should("include", "/register");

    cy.get('input[name="display_name"]').type(displayName);
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);

    cy.get('button[type="submit"]').click();

    // Deve redirecionar para a área logada (/app)
    cy.url().should("include", "/app");
    cy.contains("Painel privado").should("be.visible");

    // 2. Logout
    cy.contains("button", "Sair").should("be.visible").click();

    // Deve redirecionar de volta para o login
    cy.url().should("include", "/login");

    // 3. Login
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();

    // Deve entrar novamente no /app
    cy.url().should("include", "/app");
    cy.contains("Painel privado").should("be.visible");
  });
});
