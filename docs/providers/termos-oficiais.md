# Termos oficiais: Kilo, Modal, xKiro, Z.ai e Moonshot (R7 / T3.1)

> **Documento exclusivo do fork — controle do PA.** Vive no `main` do fork junto de `docs/operacao.md`, `docs/plano.md`, `docs/custos.md`, `docs/arquitetura.md`, `docs/decisoes.md`, `docs/desenho/` e `.claude/agent-memory/`. **Nunca entra em branch de patch nem em PR ao upstream** `tashfeenahmed/freellmapi` (R20; regra em `docs/operacao.md`). Não é parecer jurídico nem decisão de admissão.

**Consultado em:** 2026-11-27.
**Escopo:** os cinco provedores da R7, com link oficial, data da consulta e os três pontos exigidos: retenção de dados, treino com dados do usuário e permissão de agregação/roteamento por gateway.
**Como ler:** "verificado" significa cláusula pública oficial lida na data acima. "não verificado" significa fonte consultada sem cláusula acessível; não se infere comportamento a partir de terceiros. Trechos entre aspas são literais das páginas oficiais, em inglês.
**Limite:** registro de termos públicos para os critérios de admissão da issue #1. Não é parecer jurídico nem decisão de admissão — isso é da M3.1 e do cliente (P5).

## Resumo

| Provedor | Retenção de dados | Treino com dados do usuário | Permissão de agregação por gateway |
|---|---|---|---|
| **Kilo** | Verificado: enquanto a conta está ativa; exclusão remove prompts e histórico; provedores downstream têm retenção própria | Verificado **com divergência**: página EU diz que não treina com código/prompts; ToS global reserva licença ampla para melhorar serviços; treino depende do modelo escolhido | Verificado: **permitido** — a API pode disponibilizar o serviço ao usuário final, que assume a responsabilidade |
| **Modal** | Verificado: dados apagados logo após o processamento; retenção geral enquanto necessário ou exigida por lei/contrato | Verificado: **não treina** sem consentimento escrito prévio | Verificado: **não permitido** — uso só para o próprio negócio; vedado alugar, revender ou dar acesso direto a terceiros |
| **xKiro** | Verificado: conteúdo de prompt/resposta não é armazenado em operação normal; metadados e cópias de erro por ~12h; imagens ficam em link público | Verificado para parceiros: **não treina**; para usuário individual, não declarado explicitamente (**não verificado**) | Verificado: **condicionado** — ToS proíbe revender sem permissão escrita, mas há programa de parceiros oficial que autoriza revenda a End Customers com obrigações de dados |
| **Z.ai** | Verificado: usuário individual, enquanto houver conta; conversas deletáveis; na API, conteúdo processado em tempo real e não salvo | Verificado: **individual treina** (autorização explícita em User Content não pessoal); **API/empresa não treina** salvo concordância explícita | Verificado: **permitido** — integrar a API em aplicações próprias e servir End Users, com responsabilidade |
| **Moonshot (Kimi OpenPlatform)** | Verificado: exclusão após término conforme a lei; retenção apenas pelo necessário; voz 3 anos no máximo | Verificado: **treino por padrão** salvo acordo escrito ou opt-out | Verificado: **condicionado** — integrar em aplicação própria e servir End Users é permitido; vedado repassar credenciais ou revender o serviço |

Nenhum dos cinco ficou sem termo público acessível. A única fonte que falhou foi a página de ajuda da Kimi sobre segurança de API (detalhe em Moonshot).

---

## Kilo (Kilo Gateway / Kilo Code Inc.; termos agora com Anaconda, Inc.)

Fontes oficiais consultadas em 2026-11-27:

- Termos de serviço: <https://kilo.ai/terms> — "Last updated November 2, 2026".
- Política de privacidade: <https://kilo.ai/privacy> — "Last Updated: May 29, 2026".
- Catálogo de provedores do Gateway: <https://kilo.ai/providers>.
- Página EU ("Data & Privacy"): <https://kilo.ai/eu>.

**Retenção de dados — verificado.** A privacidade, em "Data retention and deletion", diz: "Once deletion is confirmed, your Kilo account, prompts, conversation history, and account metadata are removed from Kilo's systems. Data already shared with third-party AI providers to generate responses is governed by those providers' retention policies". Também: "Kilo Code will retain your information for as long as your account is active or as needed to perform our contractual obligations, provide you services through the Services, to comply with legal obligations, resolve disputes, preserve legal rights, or enforce our agreements." Dados do Google ficam enquanto a conta estiver ativa; Sentry retém erros/replays/uptime por 30–90 dias, logs e métricas por ~30 dias e alguns spans amostrados até 13 meses em planos Business/Enterprise; AppsFlyer mantém dados brutos ~90 dias e agregados até 25 meses. Informação limitada pode ser mantida indefinidamente por integridade transacional (ex.: comentários em issue do GitHub).

**Treino com dados do usuário — verificado com divergência.** A página EU afirma: "Kilo does not use your code or prompts to train models or retain them for its own purposes. Product terms and the selected provider's data handling policy still apply." Os termos globais, porém, concedem licença ampla na §7(A): "you grant Kilo a perpetual, irrevocable, fully-paid, royalty-free, worldwide, sublicensable, transferable right and license to use such Customer Data to provide and improve the Services and Kilo's other products and services, including for development, diagnostic and corrective purposes, in each case in accordance with the terms of Kilo's Data Processing Addendum, where one has been entered into", e ainda "If you elect not to grant a license to any AI Model to use your Customer Data for training purposes, you may not be able to use certain AI Models." O catálogo em `/providers` classifica cada provedador quanto a treino (20 treinam, 102 não treinam, de 122) — dado do próprio catálogo da Kilo, não dos termos de cada provedor. Registro: não há afirmação inequívoca e única de que a Kilo nunca use dados para melhoria; o treino efetivo depende do modelo/provedor selecionado. Não tratar a frase da página EU como garantia absoluta.

**Permissão de agregação — verificado, permitido.** Termos §1(A): "If you use the Kilo Gateway API to make the Services available through your application or other service ('Your Service'), you understand and agree that you are solely responsible for ensuring that end users of Your Service understand and comply with these Terms, including any usage limitations or restrictions." §5(C)(i): "you may use our Software, including our API, to make the Services available to your end users subject to these Terms." A licença da §5(A) é não sublicenciável e a §5(B) veta redistribuição de Software, mas a exceção explícita da API se aplica. A privacidade descreve o OpenRouter como camada de roteamento e diz que Account ID e metadados de requisição vão ao Kilo Gateway para autenticação, roteamento e reconciliação de cobrança.

**Não verificado:** nada de material. As classificações de treino/reenvio por provedor em `/providers` são do catálogo da Kilo e não substituem os termos do próprio provedor.

---

## Modal (Modal Labs, Inc.)

Fontes oficiais consultadas em 2026-11-27:

- Contrato (SaaS Agreement): <https://modal.com/legal/terms> — "Effective May 2026".
- Política de privacidade: <https://modal.com/legal/privacy-policy> — "Last updated May 17th, 2023".
- Data Processing Addendum: <https://modal.com/legal/dpa> — "Effective October 31, 2025" (também Anexo A do contrato).

**Retenção de dados — verificado.** Contrato §5.4: "Customer Data processed by the Service is expunged promptly following completion of processing, as described at modal.com/docs/guide/security#data-privacy." O DPA §9.1 repete a regra e a Schedule 2, em "limited data retention", diz: "Modal retains data as long as the Modal has a need for its use, or to meet regulatory or contractual requirements. Once data is no longer needed, it is securely disposed of or archived." O contrato §3.3 prevê exclusão da conta em até 60 dias após o término. A política de privacidade de 2023 não traz prazo de retenção — **não verificado nessa fonte**; a regra vigente vem do contrato e do DPA.

**Treino com dados do usuário — verificado, não treina.** Contrato §5.5.4: "Modal will not, except with Customer's prior written consent: (i) train any AI model using Customer Data, or (ii) export Customer Data into, or cause Customer Data to be ingested by, large language models." O DPA §2.1 limita o processamento às finalidades de prestação do serviço e instruções do cliente. A §1.11 permite à Modal coletar e usar "Service Metrics" de forma agregada e anonimizada, sem identificar pessoa ou cliente.

**Permissão de agregação — verificado, não permitido.** Contrato §1.1: "Any such use of the Service by Customer is solely for Customer's internal business." §1.3(c): o cliente não deve "(and will not allow any third party to) ... rent, resell or otherwise allow any third party direct access to or use of the Service". Portanto um gateway que dê acesso direto a usuários finais esbarra nessa cláusula, salvo autorização escrita separada. Observação factual: a Modal é plataforma de computação (o próprio site oferece "$30 / month free compute"), não uma API gratuita de inferência — coerente com o que a issue #1 já dizia.

**Não verificado:** a política de privacidade pública é de 2023 e não cobre retenção nem treino especificamente; não se inventou conteúdo para ela.

---

## xKiro (XKIRO Household Business, Vietnã)

Fontes oficiais consultadas em 2026-11-27:

- Termos de serviço: <https://xkiro.com/terms> — "Last updated: November 26, 2026".
- Política de privacidade: <https://xkiro.com/privacy> — "Last updated: November 25, 2026".
- Termos de parceiro e política de dados: <https://platform.xkiro.com/terms> — "Effective date: October 29, 2026".

**Retenção de dados — verificado.** Privacidade §2: "We do not store the content of your chat requests and responses in normal operation." Em caso de falha, o diagnóstico pode guardar uma cópia da requisição e da resposta parcial "SOLELY to investigate the error", apagada automaticamente "after a short period (currently 12 hours)". Metadados (modelo, tokens, hora, custo, erro) e dados técnicos são mantidos para medição, segurança e operação; imagens geradas ficam em links públicos e não são apagadas automaticamente. §7: "We retain data for as long as needed to provide the service and comply with legal obligations (e.g. financial records)." Após exclusão da conta, há 7 dias para restaurar; depois disso, identificadores do perfil são removidos, mas transações, metadados de requisição, nomes de chaves, identidades de login e prompts/imagens de geração podem ser retidos. Sentry mantém relatórios até 90 dias. Termos de parceiro §4.B.8: dados técnicos de operação são retidos por período limitado e apagados automaticamente.

**Treino com dados do usuário — parcialmente verificado.** Termos de parceiro §4.A.2: "The Partner must not use End Customer data to train models, and must not sell, rent or share that data with third parties." §4.B.7: "xKiro does not use Partner or End Customer content to train models, and does not sell or share that content with third parties for commercial purposes." A política de privacidade do site lista finalidades (operar, segurança, confiabilidade, avisos) sem declarar treino, e os termos de serviço não têm cláusula de treino. **Não verificado** para usuário individual fora do programa de parceiros; verificado como "não treina" para dados de parceiros/End Customers.

**Permissão de agregação — verificado, condicionada.** Termos §4 (acceptable use) proíbem "Resell or redistribute the service without written permission" e "Violate the usage terms of the third-party model providers your requests are routed to". Existe, porém, um programa oficial de revenda: os Termos de Parceiro em `platform.xkiro.com/terms` regem "resellers that use xKiro Platform ... to provide AI services to their own customers", com planos e chaves de API emitidos pelo parceiro a End Customers. Obrigações relevantes: §4.A.1 — o parceiro "must not store, record, capture, copy, monitor or exploit the inputs and outputs of End Customers ... unless the End Customer has given explicit written consent"; §4.A.3 — manter as chaves dos End Customers seguras; §5.1 — não compartilhar/revender chaves fora do acordo nem copiar a plataforma para serviço concorrente. Conclusão registrada: agregação é possível apenas sob o programa de parceiros, com essas restrições de dados.

**Não verificado:** treino para usuário individual (ver acima).

---

## Z.ai (Jingsheng Hengxing Technology Pte. Ltd., Singapura)

Fontes oficiais consultadas em 2026-11-27:

- Termos de uso e Termos Adicionais de API: <https://docs.z.ai/legal-agreement/terms-of-use> — "Last Update: April 14, 2026".
- Política de privacidade e DPA de API: <https://docs.z.ai/legal-agreement/privacy-policy> — "Last Update: September 29, 2025".

**Retenção de dados — verificado.** Privacidade §7: "We retain personal data for as long as it is needed to provide our Services and for the other purposes outlined in this Privacy Policy." Na prestação do serviço, "we retain it as long as you have an account. This includes your account information, input." Conversas individuais podem ser apagadas: "will be removed immediately from your conversation history and automatically deleted from our back-end." Para API, o DPA §4(b) é mais restritivo: "The Company do not store any of the content the Customer or its End Users provide or generate while using our Services. This includes any texts, or other data you input. This information is processed in real-time to provide the Customer and End Users with the API Service and is not saved on our servers." Outros dados do cliente são armazenados temporariamente e apagados após o término, salvo exigência legal (§4(c)).

**Treino com dados do usuário — verificado, dividido por tipo de usuário.** Termos §IV.3.a, para usuários individuais: "we reserve the right to process any User Content to improve our existing Services and/or to develop new products and services ... You hereby explicitly authorize and consent to our: (i) utilization and storage of User Content that does not constitute personal data for the purpose of developing and improving our machine learning and artificial intelligence technologies". A privacidade §3 inclui entre as finalidades "To improve and develop our Services and conduct research ... such as when we train and improve our models", com base em interesse legítimo, e permite agregar/anonimizar dados sem tentar reidentificar. Para API/empresa, os Termos §IV.7 dizem: "For enterprises and developers using API Services, we will not use your User Content for developing or improving Services unless you explicitly agree to such use." O DPA de API define a Z.ai como processadora sob instruções do cliente.

**Permissão de agregação — verificado, permitida com responsabilidade.** Termos Adicionais de API §1.a concedem "a non-exclusive right to access and use the API Services ... which includes the right to use Z.ai's API to integrate the Services into your applications or to develop downstream systems, applications or functions to your End Users." §1.b responsabiliza o integrador por seus End Users. Termos gerais §III.9: "If you use our Services to provide services to any third party, you assume full responsibility for all associated rights, obligations, and liabilities." Ressalvas: §III.4.f veta usar o serviço para "develop, train, or enhance any algorithms, models, or technologies that directly or indirectly compete with us"; §XIII.2 vende/revenda/transferência irrestrita a pessoas ou países sob restrição regulatória sem autorização.

**Não verificado:** nada de material.

---

## Moonshot AI / Kimi OpenPlatform (Moonshot AI Pte. Ltd.; operação-consumo por Novascent Private Limited)

Fontes oficiais consultadas em 2026-11-27:

- Termos de serviço da OpenPlatform: <https://platform.moonshot.ai/docs/agreement/modeluse> — "Last Updated: July 30th, 2026" (a documentação agora aponta para `platform.kimi.ai/docs`).
- Política de privacidade da OpenPlatform: <https://platform.moonshot.ai/docs/agreement/userprivacy> — "Last Updated: November 25, 2026".
- **Não verificada:** <https://kimi.com/en/help/kimi-api/api-data-security> — consultada duas vezes em 2026-11-27; ambas retornaram timeout. Não foi usada como fonte e nenhuma afirmação dela foi transcrita.

**Retenção de dados — verificado.** Termos §11: "After your service is terminated, we will delete your content and data in accordance with the requirements of applicable laws and regulations." No cancelamento, "your account information, data, APIs, and any remaining balance will be permanently deleted." A privacidade §7, aplicável a usuários fora da China continental: "We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy"; dados de voz são destruídos quando a finalidade se esgota ou em até 3 anos desde o último contato, o que vier primeiro; após pedido de exclusão, dados são apagados ou anonimizados salvo obrigação legal. A privacidade esclarece que não se aplica "to the extent we process information on behalf of enterprise customers" — para esses casos valem os termos/acordo da OpenPlatform.

**Treino com dados do usuário — verificado, por padrão sim.** Termos §4: "We may use Content to provide, maintain, develop, support, and improve the Services, comply with applicable law, enforce our terms and policies, and keep the Services safe and secure. Customer who requires restrictions on the use of Customer Content for training or improving Moonshot AI models may contact Moonshot AI to discuss available enterprise arrangements or separate written agreements. Unless otherwise expressly agreed in writing, Customer Content may be used for the foregoing purposes." A privacidade §1, em "User Content", diz: "We process this information to provide and improve the Services, including training and optimizing our AI models"; a §5 prevê opt-out: "If you do not want your content to be used for model training, you may contact us ... and make a request to opt out of model training." Divergência registrada: o catálogo da Kilo classifica Moonshot AI como "Trains: No", mas isso é dado do catálogo da Kilo; para este registro prevalecem os termos do próprio provedor, que autorizam o uso salvo restrição escrita/opt-out.

**Permissão de agregação — verificado, condicionada.** Termos §1: licença não exclusiva para "use Moonshot AI's APIs to integrate the Services into your own applications, products, or Services (Customer Application) and to offer those Customer Applications to End Users"; o mesmo parágrafo veta compartilhar credenciais ou "transferring, lending, leasing, or providing it to anyone for use in any form without authorization". §3.2(6) proíbe "Copying, transferring, renting, lending, selling, or providing sub-licensing or re-licensing of the Services in whole or in part without authorization". Conclusão registrada: integrar com chave própria e servir End Users é permitido; repassar credenciais ou revender o serviço em si, não.

**Não verificado:** a página de ajuda sobre segurança de API da Kimi (duas tentativas, ambas com timeout); ver detalhe nas fontes acima.
