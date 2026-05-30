# Meridian Acabamento

App de operacao da linha de acabamento: a producao registra os tempos de cada lote
e o gestor consulta a calculadora de dimensionamento. Tudo num servidor unico.

## Como roda
- 1 container Docker (Node + Express).
- Dados gravados em `data/data.json` (criado sozinho na 1a vez, a partir de `seed.json`).
- Senha protege Calculadora, Historico e Produtos. A producao so consegue registrar.
- Senha inicial: 1234 (troque dentro do app, em Produtos).

## Subir
    docker compose up -d --build
Abre em: http://SEU_IP:8090

## Backup dos dados
E so copiar o arquivo `data/data.json`. Ele tem tudo (registros, produtos e senha).

## Trocar a porta
Edite a linha "8090:8080" no docker-compose.yml (muda so o 8090).
