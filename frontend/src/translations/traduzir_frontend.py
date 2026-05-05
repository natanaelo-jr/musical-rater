import json
import re
from pathlib import Path

from deep_translator import GoogleTranslator

# O ingles e a fonte da verdade agora.
BASE_DIR = Path(__file__).resolve().parent
CAMINHO_BASE = BASE_DIR / "en.json"
IDIOMAS_DESTINO = {
    "pt": BASE_DIR / "pt.json",
}
PLACEHOLDER_RE = re.compile(r"{{\s*[\w.]+\s*}}")


def proteger_placeholders(texto):
    placeholders = PLACEHOLDER_RE.findall(texto)
    protegido = texto

    for index, placeholder in enumerate(placeholders):
        protegido = protegido.replace(placeholder, f"__VAR_{index}__")

    return protegido, placeholders


def restaurar_placeholders(texto, placeholders):
    restaurado = texto

    for index, placeholder in enumerate(placeholders):
        restaurado = restaurado.replace(f"__VAR_{index}__", placeholder)
        restaurado = restaurado.replace(f"__ VAR_{index} __", placeholder)

    return restaurado


def traduzir_locales():
    print("Lendo arquivo base em Inglês...")
    try:
        with CAMINHO_BASE.open("r", encoding="utf-8") as f:
            textos_originais = json.load(f)
    except FileNotFoundError:
        print(f"Erro: Arquivo {CAMINHO_BASE} não encontrado.")
        return

    for idioma_sigla, caminho_destino in IDIOMAS_DESTINO.items():
        print(f"\nTraduzindo para: {idioma_sigla.upper()}...")
        # Traduzindo DO inglês PARA o idioma de destino
        tradutor = GoogleTranslator(source='en', target=idioma_sigla)
        textos_traduzidos = {}

        for chave, texto in textos_originais.items():
            texto_protegido, placeholders = proteger_placeholders(texto)

            try:
                texto_traduzido = tradutor.translate(texto_protegido)
                texto_traduzido = restaurar_placeholders(
                    texto_traduzido,
                    placeholders,
                )
                textos_traduzidos[chave] = texto_traduzido
                print(f"  - {chave} -> {texto_traduzido}")
            except Exception as e:
                print(f"  [Erro] Falha na chave '{chave}': {e}")
                textos_traduzidos[chave] = texto

        caminho_destino.parent.mkdir(parents=True, exist_ok=True)
        with caminho_destino.open("w", encoding="utf-8") as f:
            json.dump(textos_traduzidos, f, ensure_ascii=False, indent=2)

        print(f"Arquivo {caminho_destino} atualizado com sucesso!")

if __name__ == "__main__":
    traduzir_locales()
