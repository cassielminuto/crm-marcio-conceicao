const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const HUBLA_CLIENTS = [{"nome": "Douglas Natan Bomfim Lima", "email": "douglaslima07@outlook.com", "telefone": "5575992318243", "valorTotal": 254.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "07/03/2026 06:14:21"}, {"nome": "Iara dos santos volovicz", "email": "iaracontabilidade@gmail.com", "telefone": "5544299919668", "valorTotal": 280.0, "produtos": ["Evento - A Restauração"], "dataPrimeiraPagamento": "01/03/2026 08:16:21"}, {"nome": "Alessandro Ferreira da Silva", "email": "alewferreiira@gmail.com", "telefone": "5511987998020", "valorTotal": 205.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "02/03/2026 08:27:16"}, {"nome": "Marcos Pereira Rodrigues", "email": "flpparana@outlook.com", "telefone": "5544999468944", "valorTotal": 304.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "17/03/2026 20:08:36"}, {"nome": "Miriam Regina dos Reis", "email": "miriamregina.reis@gmail.com", "telefone": "5531997538597", "valorTotal": 2500.0, "produtos": ["Atendimento Márcio Conceìção", "Atendimento Márcio Conceìção"], "dataPrimeiraPagamento": "02/03/2026 11:13:43"}, {"nome": "Maysa Vilhena", "email": "maysa.vilhena@gmail.com", "telefone": "5511999367012", "valorTotal": 650.0, "produtos": ["Márcio Conceìção II"], "dataPrimeiraPagamento": "02/03/2026 15:06:59"}, {"nome": "Letícia Martin Coelho", "email": "lmcfisio@hotmail.com", "telefone": "5566999656212", "valorTotal": 4000.0, "produtos": ["Atendimento Márcio Conceìção"], "dataPrimeiraPagamento": "02/03/2026 20:24:20"}, {"nome": "elisabete ribeiro nunes", "email": "elisanune2901@gmail.com", "telefone": "5598984885613", "valorTotal": 157.0, "produtos": ["Corphus IA"], "dataPrimeiraPagamento": "02/03/2026 20:28:39"}, {"nome": "Eva Campelo", "email": "evamaringa@yahoo.com", "telefone": "5544984497559", "valorTotal": 3997.0, "produtos": ["GPS do Amor II"], "dataPrimeiraPagamento": "02/03/2026 22:19:46"}, {"nome": "Isabela Ribeiro Kechichian", "email": "isabelark@hotmail.com", "telefone": "5512991325667", "valorTotal": 152.0, "produtos": ["Compatíveis"], "dataPrimeiraPagamento": "03/03/2026 08:55:17"}, {"nome": "Dinair Maria das Chagas", "email": "dinadaschagas@hotmail.com", "telefone": "5541999557822", "valorTotal": 152.08, "produtos": ["Destrava Analista I"], "dataPrimeiraPagamento": "09/03/2026 14:24:21"}, {"nome": "Fernando Prado de Mello", "email": "fernando@saraf.com.br", "telefone": "5511993747115", "valorTotal": 4000.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "03/03/2026 14:40:18"}, {"nome": "Maurício Silva Carneiro", "email": "mausilva.carneiro@gmail.com", "telefone": "5563984297359", "valorTotal": 406.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "04/03/2026 00:10:53"}, {"nome": "Lorrane Guimarães Lopes", "email": "hellopokegyn@gmail.com", "telefone": "5562991528484", "valorTotal": 5500.0, "produtos": ["Atendimento Marcio Conceiçao"], "dataPrimeiraPagamento": "09/03/2026 16:38:59"}, {"nome": "Cleide Moura da Silva Vieira", "email": "cleidemouraadv@outlook.com", "telefone": "5511945033705", "valorTotal": 145.83, "produtos": ["Márcio Conceìção II"], "dataPrimeiraPagamento": "05/03/2026 01:14:59"}, {"nome": "Candido Amalia", "email": "candidoamalia99@gmail.com", "telefone": "5513991833548", "valorTotal": 1497.0, "produtos": ["GPS do Amor II"], "dataPrimeiraPagamento": "04/03/2026 17:43:04"}, {"nome": "Jesana Talita dos Santos Rodrigues", "email": "jesanatalitasr@gmail.com", "telefone": "55353833378381", "valorTotal": 1497.0, "produtos": ["Compatíveis"], "dataPrimeiraPagamento": "04/03/2026 18:31:07"}, {"nome": "Osvaldo Haruo Tanaka", "email": "osvaldotanaka@gmail.com", "telefone": "5511941196384", "valorTotal": 2495.0, "produtos": ["GPS do Amor II"], "dataPrimeiraPagamento": "05/03/2026 16:41:55"}, {"nome": "Christiene de Oliveira Lana", "email": "christienelana@yahoo.com.br", "telefone": "5561991400506", "valorTotal": 997.0, "produtos": ["Compatíveis"], "dataPrimeiraPagamento": "05/03/2026 20:12:32"}, {"nome": "Maria Inês Barbosa Moraes", "email": "mariainesbmoraes@gmail.com", "telefone": "5542999819610", "valorTotal": 496.25, "produtos": ["Análise Corporal I", "GPS do Amor I"], "dataPrimeiraPagamento": "05/03/2026 20:41:43"}, {"nome": "Giesa Carla Pimenta", "email": "giesapimenta@gmail.com", "telefone": "5547999332201", "valorTotal": 520.0, "produtos": ["GPS do Amor II"], "dataPrimeiraPagamento": "05/03/2026 23:08:26"}, {"nome": "Ludmila Vanton Dias", "email": "ludmila.vanton.dias@hotmail.com", "telefone": "5551980256080", "valorTotal": 2497.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "06/03/2026 14:35:57"}, {"nome": "Lorena Ramos Santos", "email": "losantos24@yahoo.com.br", "telefone": "5534991990623", "valorTotal": 1541.12, "produtos": ["Análise Corporal I", "GPS do Amor I", "Destrava Analista I"], "dataPrimeiraPagamento": "06/03/2026 16:34:20"}, {"nome": "FERNANDA ROCKENBACH", "email": "fernanda-rockenbach@hotmail.com", "telefone": "5551997253263", "valorTotal": 406.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "09/03/2026 17:57:32"}, {"nome": "KATIA VALERIA BISCARO DE SOUZA TEIXEIRA", "email": "katia.treinamentos@gmail.com", "telefone": "5511970218071", "valorTotal": 997.0, "produtos": ["Compatíveis"], "dataPrimeiraPagamento": "07/03/2026 10:51:19"}, {"nome": "Elisabete Maria Neuman Ferreira Correa Machado", "email": "elisabete.maria1957@hitmail.com", "telefone": "5542991010601", "valorTotal": 406.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "07/03/2026 12:35:09"}, {"nome": "Leandro Pinheiro de Andrade Gonçalves", "email": "leandrogoncalvesemail2022@gmail.com", "telefone": "5512974020435", "valorTotal": 4000.0, "produtos": ["Análise Corporal I", "Atendimento Márcio Conceìção"], "dataPrimeiraPagamento": "07/03/2026 13:20:13"}, {"nome": "Lidiany Marques Pacheco", "email": "lidifisioterapeuta@gmail.com", "telefone": "5531975617936", "valorTotal": 2497.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "07/03/2026 16:55:40"}, {"nome": "Janaína Kroth Domingos", "email": "janainakd@hotmail.com", "telefone": "5513982059808", "valorTotal": 997.0, "produtos": ["Compatíveis"], "dataPrimeiraPagamento": "07/03/2026 17:45:47"}, {"nome": "Ana Flávia de Souza Paula", "email": "anaterrakali@gmail.com", "telefone": "5519993244254", "valorTotal": 208.33, "produtos": ["ATendimento Márcio Conceìção"], "dataPrimeiraPagamento": "08/03/2026 07:08:23"}, {"nome": "Karen Alessandra Goslar", "email": "grupokandymktg@gmail.com", "telefone": "5542991196678", "valorTotal": 280.0, "produtos": ["Evento - A Restauração"], "dataPrimeiraPagamento": "09/03/2026 10:28:01"}, {"nome": "Anderson Senff", "email": "andersonsenff@gmail.com", "telefone": "5542988141793", "valorTotal": 280.0, "produtos": ["Evento - A Restauração"], "dataPrimeiraPagamento": "09/03/2026 10:29:36"}, {"nome": "Sonia Maria Uliana", "email": "soniamariauliana9@gmail.com", "telefone": "5515991406772", "valorTotal": 497.0, "produtos": ["Compatíveis"], "dataPrimeiraPagamento": "09/03/2026 14:26:41"}, {"nome": "Paulo Afonso Andrade Mota", "email": "pauloafonso99@hotmail.com", "telefone": "5566999339033", "valorTotal": 3500.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "09/03/2026 19:44:30"}, {"nome": "Daniela Hisaye Kanashiro", "email": "danielakanashiro@icloud.com", "telefone": "5511991097491", "valorTotal": 497.0, "produtos": ["Compatíveis"], "dataPrimeiraPagamento": "09/03/2026 21:52:14"}, {"nome": "Elaine A Oliveira", "email": "elainedagostin01@gmail.com", "telefone": "5547992338708", "valorTotal": 997.0, "produtos": ["Compatíveis"], "dataPrimeiraPagamento": "09/03/2026 22:18:31"}, {"nome": "Sara Honorio Correa Parenti", "email": "sarahcparenti@gmail.com", "telefone": "5519997665682", "valorTotal": 4000.0, "produtos": ["Atendimento Márcio Conceìção"], "dataPrimeiraPagamento": "10/03/2026 15:35:18"}, {"nome": "Daniela Bedin", "email": "danyb46@hotmail.com", "telefone": "5549999901044", "valorTotal": 2245.0, "produtos": ["GPS do Amor II"], "dataPrimeiraPagamento": "10/03/2026 19:34:49"}, {"nome": "Marlene Petronilio", "email": "marlenepetronilio@gmail.com", "telefone": "5511981450857", "valorTotal": 1497.0, "produtos": ["GPS do Amor II"], "dataPrimeiraPagamento": "10/03/2026 20:31:36"}, {"nome": "Janete Demari", "email": "janetedemari@yahoo.com.br", "telefone": "5554981173620", "valorTotal": 3500.0, "produtos": ["Compatíveis | LucasG1234"], "dataPrimeiraPagamento": "12/03/2026 13:14:05"}, {"nome": "Jéssica Daniela Cresciulo da Silva", "email": "jessica.danielacrs@hotmail.com", "telefone": "5515988220807", "valorTotal": 152.0, "produtos": ["Compatíveis"], "dataPrimeiraPagamento": "20/03/2026 17:59:58"}, {"nome": "Andrea Lidiane Cletes de Moraes", "email": "lidiane.cletes@gmail.com", "telefone": "5551997002589", "valorTotal": 1000.0, "produtos": ["Compatíveis | JC1234"], "dataPrimeiraPagamento": "13/03/2026 16:01:14"}, {"nome": "Mhayra Zuldmilla Veloso Vidal", "email": "mhayra.vidal@hotmail.com", "telefone": "5561999020177", "valorTotal": 1900.0, "produtos": ["Compatíveis | LucasG1234"], "dataPrimeiraPagamento": "14/03/2026 10:44:33"}, {"nome": "Lucas Garcia", "email": "lucasrsgarcias@gmail.com", "telefone": "5551980706851", "valorTotal": 1000.0, "produtos": ["Compatíveis | LucasG1234"], "dataPrimeiraPagamento": "14/03/2026 10:58:14"}, {"nome": "Camila Maia", "email": "camimaias@gmail.com", "telefone": "5511983080379", "valorTotal": 4000.0, "produtos": ["Compatíveis | JC1234"], "dataPrimeiraPagamento": "14/03/2026 13:32:00"}, {"nome": "Vivian Rocha Korting", "email": "kortingvivian@gmail.com", "telefone": "5571992310917", "valorTotal": 2497.0, "produtos": ["Compatíveis | JC1234"], "dataPrimeiraPagamento": "14/03/2026 18:42:29"}, {"nome": "Eduardo Costa Lara", "email": "eduardocostalara@yahoo.com.br", "telefone": "5531983726653", "valorTotal": 4000.0, "produtos": ["Compatíveis | JC1234"], "dataPrimeiraPagamento": "15/03/2026 17:34:01"}, {"nome": "Sameque Santana", "email": "suportesamequesantana@gmail.com", "telefone": "5547999994517", "valorTotal": 3000.0, "produtos": ["Atendimento Marcio Conceiçao"], "dataPrimeiraPagamento": "16/03/2026 23:19:11"}, {"nome": "Karen Yanca Scherock Escobar Gavinho", "email": "karenyanca@hotmail.com", "telefone": "5569981458040", "valorTotal": 152.0, "produtos": ["compativeis | Casados"], "dataPrimeiraPagamento": "17/03/2026 07:56:51"}, {"nome": "Lidiane Monique Silva Cordeiro Lauvers", "email": "lidianemcordeiro@gmail.com", "telefone": "5531975682025", "valorTotal": 1300.0, "produtos": ["Compatíveis | LucasG1234"], "dataPrimeiraPagamento": "17/03/2026 19:26:35"}, {"nome": "Selma Helena Soares Cespedes", "email": "selmahsp@gmail.com", "telefone": "5594991427682", "valorTotal": 1550.0, "produtos": ["Compatíveis | LucasG1234"], "dataPrimeiraPagamento": "18/03/2026 12:48:29"}, {"nome": "Amanda Dos Santos Pereira Bomfim", "email": "amandalibras_interprete@outlook.com", "telefone": "5575992006581", "valorTotal": 1500.0, "produtos": ["Destrava Analista I"], "dataPrimeiraPagamento": "18/03/2026 18:21:46"}, {"nome": "Roslene Neri Almeida", "email": "lene27neri@gmail.com", "telefone": "5538999399088", "valorTotal": 357.0, "produtos": ["A Restauraçao - Brasil"], "dataPrimeiraPagamento": "20/03/2026 15:45:33"}, {"nome": "Silvana Magda Ferreira de Oliveira", "email": "rmariamarly@yahoo.com.br", "telefone": "5538991313319", "valorTotal": 657.0, "produtos": ["A Restauraçao - Brasil"], "dataPrimeiraPagamento": "22/03/2026 10:14:24"}, {"nome": "Heide Doria Dutra dos Santos", "email": "heidedoria@gmail.com", "telefone": "5511982047939", "valorTotal": 205.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "23/03/2026 09:42:29"}, {"nome": "Roseli stein", "email": "roselistein98@gmail.com", "telefone": "5567981235961", "valorTotal": 254.0, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "23/03/2026 09:52:33"}, {"nome": "Célia Fernandes Ferreira", "email": "celia.culinarista@gmail.com", "telefone": "5511997509661", "valorTotal": 202.5, "produtos": ["GPS do Amor I"], "dataPrimeiraPagamento": "23/03/2026 09:58:38"}, {"nome": "Adriana eloi Rodrigues veras", "email": "adrianaveras0504@gmail.com", "telefone": "5561999863008", "valorTotal": 850.0, "produtos": ["Compatíveis | LucasG1234"], "dataPrimeiraPagamento": "23/03/2026 20:55:45"}, {"nome": "Cristina Harumi Kimura", "email": "cristinakimuradigital@gmail.com", "telefone": "5511989238181", "valorTotal": 3497.0, "produtos": ["Compatíveis | LucasG1234", "Márcio Conceìção II"], "dataPrimeiraPagamento": "23/03/2026 21:40:04"}, {"nome": "Maria Fernanda Ximenes Blois", "email": "nandab.dev@gmail.com", "telefone": "5521969794446", "valorTotal": 100.0, "produtos": ["Compatíveis | LucasG1234"], "dataPrimeiraPagamento": "24/03/2026 14:29:26"}];

async function main() {
  console.log('Clientes Hubla para processar:', HUBLA_CLIENTS.length);
  
  let atualizados = 0;
  let criados = 0;
  let erros = 0;

  for (const client of HUBLA_CLIENTS) {
    try {
      // Buscar lead existente por telefone
      const existente = await p.lead.findFirst({
        where: { telefone: client.telefone },
      });

      if (existente) {
        // Atualizar lead existente com dados de venda
        const dados = {
          vendaRealizada: true,
          etapaFunil: 'fechado_ganho',
          status: 'convertido',
        };
        
        // Atualizar valor: usar o maior entre o existente e o da Hubla
        const valorExistente = existente.valorVenda ? Number(existente.valorVenda) : 0;
        if (client.valorTotal > valorExistente) {
          dados.valorVenda = client.valorTotal;
        }
        
        // Atualizar email se não tinha
        if (!existente.email && client.email) {
          dados.email = client.email;
        }
        
        // Atualizar data de conversão se não tinha
        if (!existente.dataConversao && client.dataPrimeiraPagamento) {
          try {
            // Parse "DD/MM/YYYY HH:mm:ss"
            const parts = client.dataPrimeiraPagamento.split(' ')[0].split('/');
            if (parts.length === 3) {
              dados.dataConversao = new Date(parts[2] + '-' + parts[1] + '-' + parts[0]);
            }
          } catch(e) {}
        }
        
        await p.lead.update({ where: { id: existente.id }, data: dados });
        atualizados++;
      } else {
        // Criar novo lead
        let dataCriacao = new Date();
        try {
          const parts = client.dataPrimeiraPagamento.split(' ')[0].split('/');
          if (parts.length === 3) {
            dataCriacao = new Date(parts[2] + '-' + parts[1] + '-' + parts[0]);
          }
        } catch(e) {}
        
        await p.lead.create({
          data: {
            nome: client.nome || 'Cliente Hubla',
            telefone: client.telefone,
            email: client.email || null,
            canal: 'bio',
            pontuacao: 80,
            classe: 'A',
            etapaFunil: 'fechado_ganho',
            status: 'convertido',
            vendedorId: 1, // Lucas (default)
            vendaRealizada: true,
            valorVenda: client.valorTotal,
            formularioTitulo: 'Importado da Hubla',
            dataPreenchimento: dataCriacao,
            dataAtribuicao: dataCriacao,
            dataConversao: dataCriacao,
            createdAt: dataCriacao,
            dadosRespondi: { importadoDe: 'hubla', produtos: client.produtos },
          },
        });
        criados++;
      }
    } catch (err) {
      erros++;
      if (erros <= 5) console.error('Erro:', client.nome, '-', err.message.slice(0, 100));
    }
  }

  console.log('\n========== RESULTADO ==========');
  console.log('Leads atualizados (ja existiam):', atualizados);
  console.log('Leads criados (novos):', criados);
  console.log('Erros:', erros);
  
  // Recount vendedor stats
  const vendedores = await p.vendedor.findMany({ where: { ativo: true } });
  for (const v of vendedores) {
    const ativos = await p.lead.count({ where: { vendedorId: v.id, status: { notIn: ['convertido', 'perdido'] } } });
    const conversoes = await p.lead.count({ where: { vendedorId: v.id, vendaRealizada: true } });
    await p.vendedor.update({ where: { id: v.id }, data: { leadsAtivos: ativos, totalConversoes: conversoes } });
  }
  console.log('Stats dos vendedores atualizados');
}

main().catch(e => console.error(e)).finally(() => p.$disconnect());
