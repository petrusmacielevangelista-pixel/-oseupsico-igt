/* ============================================================
   O SEU PSICO — IGT (projeto aposentado)
   O IGT foi migrado pra dentro do projeto Testes
   (oseupsico.com.br/testes, card "Teste de Julgamento").
   Este Worker só existe pra redirecionar o tráfego antigo.
   ============================================================ */

export default {
  async fetch(request) {
    return Response.redirect('https://oseupsico.com.br/testes/', 301);
  },
};
