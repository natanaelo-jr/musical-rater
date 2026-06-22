/* global describe, beforeEach, it, cy */
describe("Fluxo de Busca e Avaliação", () => {
  const password = "Password123!";
  const email = `cypress_user_${Date.now()}@example.com`;
  const displayName = "Cypress Searcher User";

  beforeEach(() => {
    // Registra e loga o usuário dinâmico para garantir isolamento
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("i18nextLng", "pt");
      },
    });

    // Registrar e fazer login
    cy.contains("a", "Criar conta").click();
    cy.get('input[name="display_name"]').type(displayName);
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/app");
  });

  it("permite pesquisar uma música, importá-la se necessário e avaliá-la", () => {
    // 1. Ir para a página de busca
    cy.contains("a", "Buscar").click();
    cy.url().should("include", "/app/search");

    // 2. Pesquisar por uma música/trilha
    cy.get("input#catalog-search").type("Hamilton");

    // Esperar os resultados e selecionar o primeiro resultado
    cy.get("button.text-left", { timeout: 15000 })
      .first()
      .should("be.visible")
      .click();

    // 3. Importar a música se ainda não estiver salva localmente
    cy.get("body").then(($body) => {
      if ($body.text().includes("Salvar no catálogo")) {
        cy.contains("button", "Salvar no catálogo").click();
        // Espera a importação terminar e o botão mudar
        cy.contains("Salvo no catálogo", { timeout: 10000 }).should(
          "be.visible",
        );
      }
    });

    // Espera as requisições assíncronas do useEffect (ratings e saved) completarem e atualizarem o estado
    cy.wait(1500);

    // 4. Preencher a avaliação
    // Selecionar nota 5
    cy.contains("span", "Nota").parent().contains("button", "5").click();

    // Preencher o comentário
    cy.get("textarea")
      .clear()
      .type("Sensacional! Uma das melhores composições de Lin-Manuel Miranda.");

    // Enviar a avaliação
    cy.contains("button", "Salvar avaliação").click();

    // Validar se o comentário foi salvo e aparece na tela
    cy.contains(
      "Sensacional! Uma das melhores composições de Lin-Manuel Miranda.",
    ).should("be.visible");
  });
});
