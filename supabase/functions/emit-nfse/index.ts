import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Tipos
interface EmitRequest {
  receipt_id: string;
}

interface Receipt {
  id: string;
  patient_id: string;
  amount: number;
  paid_at: string;
  professional: string;
  plan_account: string;
  observations?: string;
  patients?: { name: string; cpf?: string; email?: string };
}

// Constantes da clínica (do Supabase Secrets)
const EMITTER = {
  razao_social: "STELLE ODONTOLOGIA LTDA",
  cnpj: "30736143000127",
  inscricao_municipal: "11162320",
  codigo_ibge: "3304557",
  regime: "SN", // Simples Nacional
  email: "contato@stelle.com.br", // Configure conforme necessário
};

// Mapeamento de serviços
const SERVICOS: Record<string, { descricao: string; codigo: string }> = {
  prevencao: {
    descricao: "Tratamento Odontológico de Prevenção",
    codigo: "0301",
  },
  dentistica: {
    descricao: "Tratamento Odontológico em Dentística",
    codigo: "0301",
  },
  orto: { descricao: "Tratamento Ortodôntico", codigo: "0301" },
  alinhador: {
    descricao: "Tratamento Ortodôntico com Alinhador Digital",
    codigo: "0301",
  },
};

// Função auxiliar para gerar número RPS
function generateRpsNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `${year}${month}${day}${random}`;
}

// Função para formatar XML da DPS
function gerarXmlDps(
  receipt: Receipt,
  rpsNumber: string,
  dataEmissao: string
): string {
  const servico = SERVICOS["dentistica"] || SERVICOS["prevencao"];
  const cpfTomador = receipt.patients?.cpf?.replace(/\D/g, "") || "";

  if (!cpfTomador) {
    throw new Error("Paciente sem CPF cadastrado. NFS-e exige CPF do tomador.");
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Rps xmlns="http://www.abrasf.org.br/nfse">
  <IdentificacaoRps>
    <Numero>${rpsNumber}</Numero>
    <Serie>1</Serie>
    <Tipo>1</Tipo>
  </IdentificacaoRps>
  <DataEmissao>${dataEmissao}</DataEmissao>
  <NaturezaOperacao>1</NaturezaOperacao>
  <RegimeEspecialTributario>0</RegimeEspecialTributario>
  <OptanteSimplesNacional>1</OptanteSimplesNacional>
  <IncentivadorCultural>0</IncentivadorCultural>
  <Status>1</Status>
  <Servico>
    <Valores>
      <ValorServicos>${receipt.amount.toFixed(2)}</ValorServicos>
      <ValorDeducoes>0.00</ValorDeducoes>
      <ValorPis>0.00</ValorPis>
      <ValorCofins>0.00</ValorCofins>
      <ValorInss>0.00</ValorInss>
      <ValorIr>0.00</ValorIr>
      <ValorCsll>0.00</ValorCsll>
      <IssRetido>0</IssRetido>
      <ValorIss>0.00</ValorIss>
      <ValorIssRetido>0.00</ValorIssRetido>
      <OutrasRetencoes>0.00</OutrasRetencoes>
      <BaseCalculo>${receipt.amount.toFixed(2)}</BaseCalculo>
      <Aliquota>0.03</Aliquota>
      <ValorLiquidoNfse>${receipt.amount.toFixed(2)}</ValorLiquidoNfse>
      <DescontoIncondicionado>0.00</DescontoIncondicionado>
      <DescontoCondicionado>0.00</DescontoCondicionado>
    </Valores>
    <ItemListaServico>${servico.codigo}</ItemListaServico>
    <CodigoTributacaoMunicipio>0301</CodigoTributacaoMunicipio>
    <Descricao>${servico.descricao}</Descricao>
    <CodigoMunicipio>${EMITTER.codigo_ibge}</CodigoMunicipio>
  </Servico>
  <Prestador>
    <CpfCnpj>
      <Cnpj>${EMITTER.cnpj}</Cnpj>
    </CpfCnpj>
    <InscricaoMunicipal>${EMITTER.inscricao_municipal}</InscricaoMunicipal>
    <RazaoSocial>${EMITTER.razao_social}</RazaoSocial>
    <NomeFantasia>${EMITTER.razao_social}</NomeFantasia>
  </Prestador>
  <Tomador>
    <IdentificacaoTomador>
      <CpfCnpj>
        <Cpf>${cpfTomador}</Cpf>
      </CpfCnpj>
    </IdentificacaoTomador>
    <RazaoSocial>${receipt.patients?.name || "NÃO INFORMADO"}</RazaoSocial>
    <NomeFantasia>${receipt.patients?.name || "NÃO INFORMADO"}</NomeFantasia>
    <Contato>
      <Email>${receipt.patients?.email || EMITTER.email}</Email>
    </Contato>
  </Tomador>
  <Intermediario>
    <IdentificacaoIntermediario>
      <CpfCnpj>
        <Cnpj>00000000000000</Cnpj>
      </CpfCnpj>
    </IdentificacaoIntermediario>
  </Intermediario>
  <ConstrucaoCivil>
    <CodigoObra>0</CodigoObra>
    <Art>0</Art>
  </ConstrucaoCivil>
</Rps>`;

  return xmlContent;
}

// Função para enviar para SEFAZ (simulação - em produção usar mTLS real)
async function enviarParaSefaz(
  xmlSinado: string,
  _rpsNumber: string,
  _supabaseClient: any
): Promise<{
  numero: string;
  chaveAcesso: string;
  status: string;
  urlPdf?: string;
}> {
  // Em produção, aqui você:
  // 1. Carregaria o certificado do Supabase Secret (CERT_PFX_BASE64)
  // 2. Configuraria mTLS com Deno.HttpClient
  // 3. Faria POST para https://adn.nfse.gov.br/nfse
  // 4. Processaria resposta XML

  // Por enquanto, simulamos a resposta para testes
  console.log(
    "📤 [SIMULADO] Enviando XML para SEFAZ...",
    xmlSinado.substring(0, 100)
  );

  // Simula resposta da SEFAZ
  return {
    numero: "123456",
    chaveAcesso: "35240611162320000127550010000000011123456789",
    status: "autorizada",
    urlPdf:
      "https://nfse.example.com/pdf/35240611162320000127550010000000011123456789.pdf",
  };
}

// Handler principal
export default async (req: Request) => {
  try {
    // Validar método HTTP
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método não permitido. Use POST." }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parsear body
    const body: EmitRequest = await req.json();
    const { receipt_id } = body;

    if (!receipt_id) {
      return new Response(
        JSON.stringify({ error: "receipt_id é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Variáveis Supabase não configuradas");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar receipt com dados do paciente
    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select(`*, patients:patient_id (id, name, cpf, email)`)
      .eq("id", receipt_id)
      .single();

    if (receiptError || !receipt) {
      return new Response(
        JSON.stringify({ error: "Recebimento não encontrado" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Validar dados obrigatórios
    if (!receipt.patients?.cpf) {
      // Atualizar com erro
      await supabase
        .from("receipts")
        .update({
          invoice_status: "erro",
          invoice_error: "Paciente sem CPF cadastrado. NFS-e exige CPF do tomador.",
          invoice_emitted_at: new Date().toISOString(),
        })
        .eq("id", receipt_id);

      return new Response(
        JSON.stringify({
          error:
            "Paciente sem CPF cadastrado. NFS-e exige CPF do tomador.",
          status: "erro",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Gerar número RPS e XML
    const rpsNumber = generateRpsNumber();
    const dataEmissao = new Date().toISOString().split("T")[0];

    let xmlDps: string;
    try {
      xmlDps = gerarXmlDps(receipt, rpsNumber, dataEmissao);
    } catch (e: any) {
      await supabase
        .from("receipts")
        .update({
          invoice_status: "erro",
          invoice_error: `Erro ao gerar XML: ${e.message}`,
          invoice_emitted_at: new Date().toISOString(),
        })
        .eq("id", receipt_id);

      return new Response(
        JSON.stringify({
          error: `Erro ao gerar XML: ${e.message}`,
          status: "erro",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Enviar para SEFAZ (com tratamento de erro)
    let sefazResponse: any;
    try {
      sefazResponse = await enviarParaSefaz(xmlDps, rpsNumber, supabase);
    } catch (e: any) {
      const errorMsg = e.message || "Erro ao comunicar com SEFAZ";
      await supabase
        .from("receipts")
        .update({
          invoice_status: "erro",
          invoice_error: errorMsg,
          invoice_emitted_at: new Date().toISOString(),
        })
        .eq("id", receipt_id);

      return new Response(
        JSON.stringify({
          error: errorMsg,
          status: "erro",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Atualizar receipt com dados da NFS-e
    const { error: updateError } = await supabase
      .from("receipts")
      .update({
        invoice_status: sefazResponse.status,
        invoice_number: sefazResponse.numero,
        invoice_access_key: sefazResponse.chaveAcesso,
        invoice_rps_number: rpsNumber,
        invoice_pdf_url: sefazResponse.urlPdf,
        invoice_emitted_at: new Date().toISOString(),
      })
      .eq("id", receipt_id);

    if (updateError) {
      console.error("Erro ao atualizar receipt:", updateError);
      throw updateError;
    }

    // 6. Retornar sucesso
    return new Response(
      JSON.stringify({
        status: "sucesso",
        invoice: {
          numero: sefazResponse.numero,
          chaveAcesso: sefazResponse.chaveAcesso,
          status: sefazResponse.status,
          urlPdf: sefazResponse.urlPdf,
        },
        mensagem: `NFS-e #${sefazResponse.numero} autorizada com sucesso!`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro não tratado:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro interno do servidor",
        status: "erro",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
