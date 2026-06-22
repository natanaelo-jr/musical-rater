/* global describe, before, beforeEach, it, cy */

describe("Edição de Conta/Perfil", () => {
  const email = "usuario_teste@example.com";
  const password = "Password123!";

  before(() => {
    // Garante que o usuário existe no banco de dados para o teste de usuário existente.
    // Usamos failOnStatusCode: false caso o usuário já esteja cadastrado localmente.
    cy.request({
      method: "POST",
      url: "/api/auth/register",
      body: {
        email,
        password,
        display_name: "Usuário de Teste",
      },
      failOnStatusCode: false,
    });
  });

  beforeEach(() => {
    // Garante o idioma em Português (pt) para consistência dos seletores
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("i18nextLng", "pt");
      },
    });

    // Realiza login automático usando o comando customizado
    cy.login(email, password);
  });

  it("deve permitir navegar até a página de perfil, editar as informações e salvar com sucesso", () => {
    const uniqueId = Math.floor(Math.random() * 100000);
    const newDisplayName = `Nome Atualizado ${uniqueId}`;
    const newUsername = `usuario_${uniqueId}`;
    const newAvatarUrl = `https://example.com/avatar-${uniqueId}.png`;
    const newBio = `Esta é a minha nova biografia número ${uniqueId}.`;

    // 1. Navegar até a página de configurações/edição de perfil
    cy.contains("a", "Perfil").should("be.visible").click();
    cy.url().should("include", "/app/profile");

    // Apenas garante que o título principal do perfil está carregado e visível
    cy.get("h1").should("be.visible");

    // Clica no botão para abrir as configurações
    cy.contains("button", "Configurações do perfil").should("be.visible").click();

    // Confirma que a seção de configurações foi aberta
    cy.contains("h2", "Edite os detalhes que as pessoas veem no seu perfil.").should("be.visible");

    // 2. Alterar informações nos campos disponíveis com valores dinâmicos e únicos
    cy.get('input[name="display_name"]').should("be.visible").clear().type(newDisplayName);
    cy.get('input[name="username"]').should("be.visible").clear().type(newUsername);
    cy.get('input[name="avatar_url"]').should("be.visible").clear().type(newAvatarUrl);
    cy.get('textarea[name="bio"]').should("be.visible").clear().type(newBio);

    // 3. Submeter o formulário
    cy.contains("button", "Salvar perfil").should("be.visible").click();

    // 4. Validar se a interface atualizou os dados corretamente e fechou o formulário de edição
    // O formulário de configurações deve sumir após salvar com sucesso
    cy.contains("h2", "Edite os detalhes que as pessoas veem no seu perfil.").should("not.exist");

    // O cabeçalho do perfil deve refletir as novas alterações na tela
    cy.contains("h1", newDisplayName).should("be.visible");
    cy.contains("p", `@${newUsername}`).should("be.visible");
    cy.contains("p", newBio).should("be.visible");
  });
});
