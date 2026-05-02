import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          // landing page
          hero_title: "Rate cast albums, track favorites, and shape a profile.",
          create_account: "Create account",
          sign_in: "Sign in",

          // sign in page
          login_eyebrow: "Welcome back",
          login_title: "Sign in to your private rating desk.",
          email_label: "Email",
          password_label: "Password",
          signing_in: "Signing in...",
          no_account: "No account yet?",
          create_one: "Create one",

          // create account page
          register_eyebrow: "Create profile",
          register_title: "Start your account and unlock private pages.",
          display_name_label: "Display name",
          display_name_placeholder: "Broadway fan",
          email_placeholder: "you@example.com",
          password_placeholder: "At least 8 characters",
          creating_account: "Creating...",
          already_registered: "Already registered?",

          // dashboard page
          dashboard_eyebrow: "Private dashboard",
          dashboard_title: "{{name}}, your account is live.",
          dashboard_lede:
            "Start searching the shared catalog, import songs or albums into the local database, and build the foundation for ratings, favorites, and recommendations.",
          search_catalog: "Search catalog",
          edit_profile: "Edit profile",
          find_people: "Find people",
          sign_out: "Sign out",
          recently_rated_eyebrow: "Recently rated",
          rate_more: "Rate more",
          latest_scores: "Your latest scores",
          empty_recent_ratings: "Rate an imported track and it will land here.",
          next_actions_eyebrow: "Next actions",
          action_search_title: "Catalog search",
          action_search_desc:
            "Look up songs and albums from MusicBrainz without leaving the app.",
          action_import_title: "Local import",
          action_import_desc:
            "Save selected results to the local catalog when you are ready to use them.",
          action_profile_title: "Profile",
          action_profile_desc_empty:
            "Set your public identity before sharing reviews.",
          action_taste_title: "Taste signal",
          action_taste_desc_empty: "Tell us what you listen to.",
          action_following_title: "Following",
          action_following_desc: "Find listeners to follow.",

          back_to_dashboard: "Back to dashboard",

          // search page
          search_page_eyebrow: "Catalog search",
          search_page_title: "Find the songs and albums you want to rate next.",
          search_query_label: "Search query",
          search_placeholder_catalog: "Search by song, album, or artist",
          filter_all: "All",
          filter_tracks: "Tracks",
          filter_albums: "Albums",
          search_help_text: "Search for songs and albums from the catalog.",
          selection_eyebrow: "Selection",
          selection_empty_text:
            "Pick a search result to inspect its metadata and import it to the local catalog.",

          // profile page
          profile_eyebrow: "Edit profile",
          profile_title: "Personalize your private identity.",
          username_label: "Username",
          avatar_url_label: "Avatar URL",
          bio_label: "Bio",
          bio_placeholder: "Share your favorite cast recordings.",
          save_profile: "Save profile",
          saving_profile: "Saving...",

          // people page
          people_eyebrow: "People",
          people_title: "Find listeners to follow.",
          search_listeners_label: "Search listeners",
          search_listeners_placeholder: "Search by name, username, or email",
          search_listeners_help:
            "Search for listeners by name, username, or email.",
        },
      },
      pt: {
        translation: {
          // landing page
          hero_title: "Avalie álbuns, acompanhe favoritos e crie seu perfil.",
          create_account: "Criar conta",
          sign_in: "Entrar",

          // sign in page
          login_eyebrow: "Bem-vindo de volta",
          login_title: "Entre na sua mesa de avaliação privada.",
          email_label: "E-mail",
          password_label: "Senha",
          signing_in: "Entrando...",
          no_account: "Ainda não tem conta?",
          create_one: "Crie uma",

          // create account page
          register_eyebrow: "Criar perfil",
          register_title: "Crie sua conta e desbloqueie as páginas privadas.",
          display_name_label: "Nome de exibição",
          display_name_placeholder: "Fã de musicais",
          email_placeholder: "voce@exemplo.com",
          password_placeholder: "Pelo menos 8 caracteres",
          creating_account: "Criando...",
          already_registered: "Já tem cadastro?",

          // dashboard page
          dashboard_eyebrow: "Painel privado",
          dashboard_title: "{{name}}, sua conta está ativa.",
          dashboard_lede:
            "Comece a pesquisar o catálogo compartilhado, importe músicas ou álbuns para o banco de dados local e construa a base para avaliações, favoritos e recomendações.",
          search_catalog: "Buscar no catálogo",
          edit_profile: "Editar perfil",
          find_people: "Encontrar pessoas",
          sign_out: "Sair",
          recently_rated_eyebrow: "Avaliados recentemente",
          rate_more: "Avaliar mais",
          latest_scores: "Suas últimas notas",
          empty_recent_ratings:
            "Avalie uma faixa importada e ela aparecerá aqui.",
          next_actions_eyebrow: "Próximas ações",
          action_search_title: "Busca no catálogo",
          action_search_desc:
            "Procure músicas e álbuns do MusicBrainz sem sair do aplicativo.",
          action_import_title: "Importação local",
          action_import_desc:
            "Salve os resultados selecionados no catálogo local quando estiver pronto para usá-los.",
          action_profile_title: "Perfil",
          action_profile_desc_empty:
            "Defina sua identidade pública antes de compartilhar avaliações.",
          action_taste_title: "Sinal de gosto",
          action_taste_desc_empty: "Conte-nos o que você escuta.",
          action_following_title: "Seguindo",
          action_following_desc: "Encontre ouvintes para seguir.",

          back_to_dashboard: "Voltar para o painel",

          // search page
          search_page_eyebrow: "Busca no catálogo",
          search_page_title:
            "Encontre as músicas e álbuns que você quer avaliar.",
          search_query_label: "Consulta de busca",
          search_placeholder_catalog: "Busque por música, álbum ou artista",
          filter_all: "Todos",
          filter_tracks: "Faixas",
          filter_albums: "Álbuns",
          search_help_text: "Busque por músicas e álbuns do catálogo.",
          selection_eyebrow: "Seleção",
          selection_empty_text:
            "Escolha um resultado da busca para inspecionar seus metadados e importá-lo para o catálogo local.",

          // profile page
          profile_eyebrow: "Editar perfil",
          profile_title: "Personalize sua identidade privada.",
          username_label: "Nome de usuário",
          avatar_url_label: "URL do Avatar",
          bio_label: "Biografia",
          bio_placeholder: "Compartilhe suas gravações de elenco favoritas.",
          save_profile: "Salvar perfil",
          saving_profile: "Salvando...",

          // people page
          people_eyebrow: "Pessoas",
          people_title: "Encontre ouvintes para seguir.",
          search_listeners_label: "Buscar ouvintes",
          search_listeners_placeholder: "Buscar por nome, usuário ou e-mail",
          search_listeners_help:
            "Busque por ouvintes por nome, nome de usuário ou e-mail.",
        },
      },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
