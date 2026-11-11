# Flexato

> Etanol ou gasolina? A resposta certa para o **seu** carro.

Flexato é uma calculadora que diz se compensa mais abastecer com etanol ou gasolina, levando em conta o consumo real do seu carro flex, e não a regra genérica dos 70%.

Este repositório contém a versão **web** (frontend, backend e banco de dados). O aplicativo mobile fica em um repositório separado e consome a API deste projeto.

## O problema

A maioria das calculadoras divide o preço do etanol pelo da gasolina e recomenda etanol quando o resultado é menor que 0,7. Essa regra pressupõe que todo carro faz no etanol 70% dos km/l que faz na gasolina. Isso não é verdade: alguns carros chegam perto de 75%, outros ficam abaixo de 65%. Nesses casos a regra erra a recomendação.

## O diferencial

O Flexato usa o consumo de cada carro:

- Consumo em **cidade** e **estrada**, com **etanol** e **gasolina** (4 valores por carro).
- Dados pré-preenchidos a partir da tabela oficial do Inmetro (PBEV), sempre editáveis pelo usuário.
- Preço médio dos combustíveis da sua cidade ou do seu estado, com base no levantamento semanal da ANP, também editável.

### Como o cálculo funciona

Para cada combustível, o sistema calcula o custo por quilômetro ponderado pelo perfil de uso informado (% cidade / % estrada):

```
custo_km = %cidade × (preço / consumo_cidade) + %estrada × (preço / consumo_estrada)
```

O combustível com o menor `custo_km` vence. A ponderação é feita sobre o custo por km, e não sobre a média simples dos km/l, que distorce o resultado quando os consumos de cidade e estrada são muito diferentes.

## Funcionalidades (MVP)

- **Calculadora sem login**: escolha um carro do catálogo (ou informe os consumos), confira os preços e veja a recomendação na hora.
- **Perfil de uso**: atalhos Cidade, Estrada e Ambos (50/50), mais um ajuste fino em % cidade/estrada.
- **Economia em R$**: quanto você economiza por tanque cheio e por mês com a escolha recomendada.
- **Catálogo de carros flex**: importado da tabela PBEV do Inmetro (marca, modelo, versão e os 4 consumos).
- **Carro personalizado**: se o seu carro não estiver no catálogo, cadastre nome e consumos. Esse cadastro fica privado na sua conta.
- **Conta opcional**: salve seus carros e acesse os mesmos dados no aplicativo mobile.
- **Localização automática**: com sua permissão, o navegador informa a localização para descobrir sua cidade e UF. Também é possível escolher manualmente.
- **Preços por localidade**: média da sua cidade quando a ANP tiver dados dela, ou média da UF.

## Roadmap

- Registro de abastecimentos (litros + hodômetro) para calcular o consumo real e sugerir ajuste nos km/l do carro.
- Faixa de preço da semana (mínimo / médio / máximo) e "preço de virada": até quanto o etanol compensa para o seu carro.
- Histórico e gráficos de preço por localidade.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Web (front + API) | [Next.js](https://nextjs.org/) com TypeScript |
| UI | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Banco de dados | PostgreSQL + PostGIS via [Supabase](https://supabase.com/) |
| Autenticação | Supabase Auth |

## Arquitetura

- **Web e API no mesmo projeto Next.js.** A API REST é exposta em `/api/v1` e é o único contrato usado pelo site e pelo aplicativo mobile. Toda regra de negócio (cálculo, carros, preços) fica no backend.
- **Autenticação via Supabase.** O app mobile faz login no Supabase e chama a API com o JWT do usuário.
- **Jobs de importação:**
  - **Preços (semanal)**: baixa a planilha do Levantamento de Preços de Combustíveis da ANP e grava a média por município e por UF.
  - **Catálogo de carros (sob demanda)**: importa a tabela PBEV do Inmetro sempre que uma nova versão é publicada.
- **Geolocalização**: a malha municipal do IBGE é armazenada no PostGIS. A localização do usuário é convertida em município/UF no próprio banco, sem serviços de terceiros.

## Fontes de dados

| Dado | Fonte | Formato |
| --- | --- | --- |
| Consumo dos veículos | [Inmetro – PBE Veicular](https://www.gov.br/inmetro/pt-br/assuntos/avaliacao-da-conformidade/programa-brasileiro-de-etiquetagem/tabelas-de-eficiencia-energetica/veiculos-automotivos-pbe-veicular) | PDF / planilha |
| Preço dos combustíveis | [ANP – Levantamento de Preços de Combustíveis](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas) | XLSX semanal |
| Malha municipal | [IBGE – Malhas territoriais](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html) | Shapefile / GeoJSON |

Os valores do Inmetro vêm de testes padronizados e podem diferir do consumo no dia a dia. Os preços da ANP são médias semanais e podem variar entre postos. Por isso, o usuário sempre pode editar ambos.

## Status

🚧 Em fase inicial: estrutura do repositório definida, sem código ainda.

## Licença

Distribuído sob a licença MIT. Veja [LICENSE](LICENSE).
