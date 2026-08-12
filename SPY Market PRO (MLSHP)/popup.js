document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab, .panel').forEach(el => el.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.add('active');
  });
});

let dadosAtuais = null;
let mercadoDetectado = "mercado_livre"; 
let resumoVitrineSalvo = null; 
let filtrandoApenasConcorrentes = false; 

const URL_PLANILHA = "https://docs.google.com/spreadsheets/d/1Kq9HubrkpYUGLV4nMyVZakli-E2Jq8B6Wuf2M0q_-hc/edit?usp=sharing";
const SPREADSHEET_ID = "1Kq9HubrkpYUGLV4nMyVZakli-E2Jq8B6Wuf2M0q_-hc"; 

// 🚀 URL DO SEU APPS SCRIPT ATUALIZADA (PRODUÇÃO)
const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbx4lM7FCIZ68ZE7pWw8-Ynk-67VVroG7vRoT8ZevcEStX2d3rXQoDpazJE2WfpPn6cp/exec"; 

document.getElementById('btn-abrir-planilha').addEventListener('click', () => {
  chrome.tabs.create({ url: URL_PLANILHA });
});

// --- LÓGICA DE DRAG AND DROP DA PLANILHA LOCAL ---
const dropZone = document.getElementById('drop-zone-planilha');
const fileInput = document.getElementById('file-input-planilha');
const statusUpload = document.getElementById('status-upload');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const arquivos = e.dataTransfer.files;
  if (arquivos.length > 0) {
    processarPlanilhaLocal(arquivos[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    processarPlanilhaLocal(e.target.files[0]);
  }
});

function exibirStatus(mensagem, tipo) {
  statusUpload.innerText = mensagem;
  statusUpload.style.display = 'block';
  if (tipo === 'sucesso') {
    statusUpload.style.backgroundColor = '#c6f6d5';
    statusUpload.style.color = '#22543d';
  } else if (tipo === 'erro') {
    statusUpload.style.backgroundColor = '#fed7d7';
    statusUpload.style.color = '#742a2a';
  } else {
    statusUpload.style.backgroundColor = '#feebc8';
    statusUpload.style.color = '#744210';
  }
}

function processarPlanilhaLocal(arquivo) {
  if (!arquivo.name.endsWith('.csv') && !arquivo.name.endsWith('.txt')) {
    exibirStatus('❌ Formato inválido! Por favor, use um arquivo .csv', 'erro');
    return;
  }

  exibirStatus('⏳ Lendo arquivo local...', 'aviso');
  const reader = new FileReader();
  
  reader.onload = function(e) {
    let texto = e.target.result;
    
    // Remove o caractere invisível BOM (\uFEFF) caso venha do Excel
    if (texto.startsWith('\uFEFF')) {
      texto = texto.substring(1);
    }
    
    const linhas = texto.split(/\r?\n/);
    const dadosMatriz = [];

    if (linhas.length === 0 || linhas[0].trim() === '') {
      exibirStatus('⚠️ Planilha vazia ou sem dados válidos.', 'erro');
      return;
    }

    const primeiraLinha = linhas[0];
    const separador = primeiraLinha.includes(';') ? ';' : ',';

    linhas.forEach(linha => {
      if (linha.trim() !== '') {
        const colunas = linha.split(separador).map(col => col.replace(/^"|"$/g, '').trim());
        dadosMatriz.push(colunas);
      }
    });

    if (dadosMatriz.length <= 1) {
      exibirStatus('⚠️ Planilha contém apenas o cabeçalho.', 'erro');
      return;
    }

    sincronizarComPlanilhaOnline(dadosMatriz);
  };

  reader.readAsText(arquivo, 'UTF-8');
}

async function sincronizarComPlanilhaOnline(dados) {
  exibirStatus('🚀 Enviando dados para a nuvem...', 'aviso');

  try {
    // Trata a coluna D (índice 3 - vendas) para remover o '+' que causa erro de fórmula (#ERROR!) no Sheets
    const dadosTratados = dados.map((linha, indexLinha) => {
      if (indexLinha === 0) return linha; // Pula o cabeçalho
      return linha.map((celula, colIdx) => {
        if (colIdx === 3 && typeof celula === 'string') {
          return celula.replace(/^\+/, '').trim();
        }
        return celula;
      });
    });

    await fetch(APPS_SCRIPT_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ spreadsheetId: SPREADSHEET_ID, valores: dadosTratados })
    });
    
    exibirStatus('✅ Planilha Online atualizada com sucesso!', 'sucesso');
    
    chrome.storage.local.get(['concorrentes'], (res) => {
      let listaLocal = res.concorrentes || [];
      for (let i = 1; i < dados.length; i++) {
        const row = dados[i];
        if(!row[0]) continue;
        
        let vTexto = (row[3] || "").replace(/^\+/, '').trim();
        let vNum = parseInt(row[4]) || parseInt(vTexto.replace(/[^\d]/g, ''), 10) || 0;

        listaLocal.unshift({
          titulo: row[0], preco: row[1], precoLimpo: parseFloat(row[2]) || null,
          vendas: vTexto, vendasNumero: vNum, faturamentoEstimado: parseFloat(row[5]) || 0,
          posicao: row[6], avaliacaoNota: row[7], vendedor: row[9] || row[8],
          frete: row[10], freteDetalhe: row[11], marketplace: row[12], data: row[13] || new Date().toLocaleDateString('pt-BR'),
          url: row[14], relevancia: row[15], ads: row[16], concorrente: row[17] || ''
        });
      }
      chrome.storage.local.set({ concorrentes: listaLocal }, atualizarListaConcorrentes);
    });

  } catch (erro) {
    exibirStatus('❌ Erro de rede ao conectar com o Google Sheets.', 'erro');
    console.error(erro);
  }
}

// --- FIM DA LÓGICA DE DRAG AND DROP ---

const btnFiltrar = document.getElementById('btn-filtrar-concorrentes');
btnFiltrar?.addEventListener('click', () => {
  filtrandoApenasConcorrentes = !filtrandoApenasConcorrentes;
  
  if (filtrandoApenasConcorrentes) {
    btnFiltrar.innerHTML = "Limpar Filtro ❌";
    btnFiltrar.style.backgroundColor = "#fff5f5";
    btnFiltrar.style.borderColor = "#feb2b2";
    btnFiltrar.style.color = "#c53030";
  } else {
    btnFiltrar.innerHTML = "Concorrentes ⭐";
    btnFiltrar.style.backgroundColor = "#edf2f7";
    btnFiltrar.style.borderColor = "#cbd5e0";
    btnFiltrar.style.color = "#4a5568";
  }
  
  atualizarListaConcorrentes();
});

document.getElementById('btn-mapear-vitrine').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || tab.url.startsWith('chrome://')) {
    alert('Abra uma página de busca ou categoria válida antes de mapear.');
    return;
  }
  chrome.tabs.sendMessage(tab.id, { action: "extrair_vitrine" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      alert('Por favor, atualize a página (F5) para carregar o script de captura.');
      return;
    }
    if (!response.itens || response.itens.length === 0) {
      alert('Nenhum produto detectado nesta página.');
      return;
    }

    mercadoDetectado = response.marketplace;

    const totalItens = response.itens.length;
    let totalAds = 0;
    let totalFreteGratis = 0;
    let faturamentoGeral = 0;
    let precosValidos = [];

    response.itens.forEach(item => {
      if (item.ads === 'S' || item.ads === 'true') totalAds++;
      if (item.frete && item.frete.toLowerCase().includes('grátis')) totalFreteGratis++;
      if (item.faturamentoEstimado) faturamentoGeral += item.faturamentoEstimado;
      if (item.precoLimpo) precosValidos.push(item.precoLimpo);
    });

    let precoMin = precosValidos.length ? Math.min(...precosValidos) : 0;
    let precoMax = precosValidos.length ? Math.max(...precosValidos) : 0;
    let precoMedio = precosValidos.length ? (precosValidos.reduce((a, b) => a + b, 0) / precosValidos.length) : 0;
    let fretePct = totalItens ? Math.round((totalFreteGratis / totalItens) * 100) : 0;
    let adsPct = totalItens ? Math.round((totalAds / totalItens) * 100) : 0;

    resumoVitrineSalvo = { totalItens, adsPct, precoMin, precoMax, precoMedio };

    document.getElementById('card-dados').style.display = 'none';
    document.getElementById('btn-salvar-concorrente').style.display = 'none';
    
    document.getElementById('res-total').innerText = `${totalItens} produtos`;
    document.getElementById('res-ads').innerText = `${totalAds} (${adsPct}%)`;
    document.getElementById('res-min').innerText = `R$ ${precoMin.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('res-max').innerText = `R$ ${precoMax.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('res-medio').innerText = `R$ ${precoMedio.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById('res-frete-pct').innerText = `${fretePct}%`;
    document.getElementById('res-fat-total').innerText = faturamentoGeral > 0 ? `R$ ${faturamentoGeral.toLocaleString('pt-BR')}` : 'R$ 0,00';
    
    document.getElementById('card-resumo').style.display = 'block';

    if (precoMedio > 0) {
      document.getElementById('v-venda').value = precoMedio.toFixed(2);
    }

    chrome.storage.local.get(['concorrentes'], (res) => {
      const list = res.concorrentes || [];
      const urlsExistentes = new Set(list.map(i => i.url).filter(Boolean));
      
      response.itens.forEach(item => {
        if (item.url && urlsExistentes.has(item.url)) return;
        
        let vTexto = (item.vendas || "").replace(/^\+/, '').trim();
        let vNum = item.vendasNumero || parseInt(vTexto.replace(/[^\d]/g, ''), 10) || 0;

        list.unshift({
          titulo: item.titulo, preco: item.preco, precoLimpo: item.precoLimpo,
          vendas: vTexto, vendasNumero: vNum, faturamentoEstimado: item.faturamentoEstimado,
          posicao: item.posicao, avaliacaoNota: item.avaliacaoNota, vendedor: item.vendedor, 
          frete: item.frete, freteDetalhe: item.freteDetalhe, url: item.url,
          marketplace: response.marketplace, data: new Date().toLocaleDateString('pt-BR'),
          relevancia: item.relevancia || 'Baixa', ads: item.ads || 'N', concorrente: item.concorrente || '' 
        });
        if (item.url) urlsExistentes.add(item.url);
      });
      
      chrome.storage.local.set({ concorrentes: list }, () => {
        atualizarListaConcorrentes();
      });
    });
  });
});

document.getElementById('exportar-csv').addEventListener('click', () => {
  chrome.storage.local.get(['concorrentes'], (res) => {
    const list = res.concorrentes || [];
    if (list.length === 0) {
      alert('Não há concorrentes salvos para exportar.');
      return;
    }

    const cabecalhosPlanilha = [
      'titulo', 'preco', 'precoLimpo', 'vendas', 'vendasNumero', 
      'faturamentoEstimado', 'posicao', 'avaliacaoNota', 
      'Cidade/Estado', 'Vendedor_Loja', 
      'frete', 'freteDetalhe', 'marketplace', 'data', 'url', 'relevancia', 'ads', 'Concorrentes'
    ];

    const escapar = (v) => `"${String(v ?? '').replace(/[\r\n]+/g, ' ').replace(/"/g, '""')}"`;
    const linhas = [cabecalhosPlanilha.join(';')];
    
    list.forEach(item => {
      let textoCru = item.vendedor || '';
      let cidadeEstado = '';
      let loja = '';

      if (textoCru.includes('por') || textoCru.includes('POR')) {
        loja = textoCru;
      } else if (textoCru.includes(',')) {
        cidadeEstado = textoCru; 
      } else {
        let estadosComuns = ['São Paulo', 'Rio de Janeiro', 'Santa Catarina', 'Paraná', 'Minas Gerais', 'Bahia', 'Rio Grande do Sul', 'Goiás', 'Ceará', 'Pernambuco'];
        if (estadosComuns.includes(textoCru)) {
          cidadeEstado = textoCru;
        } else if (textoCru.trim() !== '' && textoCru !== 'Não informado' && textoCru !== 'Desconhecida') {
          loja = textoCru;
        }
      }

      // Garante que o texto de vendas exportado no CSV não comece com '+' para evitar erro de fórmula no Excel/Sheets
      let vendasExport = String(item.vendas || '').replace(/^\+/, '').trim();

      let dadosLinha = [
        escapar(item.titulo), escapar(item.preco), escapar(item.precoLimpo),
        escapar(vendasExport), escapar(item.vendasNumero), escapar(item.faturamentoEstimado),
        escapar(item.posicao), escapar(item.avaliacaoNota), escapar(cidadeEstado), 
        escapar(loja), escapar(item.frete), escapar(item.freteDetalhe),
        escapar(item.marketplace), escapar(item.data), escapar(item.url),
        escapar(item.relevancia), escapar(item.ads), escapar(item.concorrente)
      ];
      linhas.push(dadosLinha.join(';'));
    });
    
    const csv = '\uFEFF' + linhas.join('\r\n');
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const dataHoje = new Date().toISOString().slice(0, 10);
    
    chrome.downloads.download({
      url: blobUrl,
      filename: `concorrentes_${dataHoje}.csv`,
      saveAs: false
    });
  });
});

document.getElementById('btn-capturar').addEventListener('click', async () => {
  document.getElementById('card-resumo').style.display = 'none';
  document.getElementById('card-dados').style.display = 'block';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || tab.url.startsWith('chrome://')) {
    alert('Abra um anúncio válido antes de escanear.');
    return;
  }

  if (tab.url.includes('shopee.com.br')) mercadoDetectado = 'shopee';
  else if (tab.url.includes('mercadolivre.com.br')) mercadoDetectado = 'mercado_livre';

  chrome.tabs.sendMessage(tab.id, { action: "extrair_dados" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      alert('Por favor, atualize a página (F5) antes de rodar o escaneamento.');
      return;
    }
    
    let vTexto = (response.vendas || "").replace(/^\+/, '').trim();
    let vNum = response.vendasNumero || parseInt(vTexto.replace(/[^\d]/g, ''), 10) || 0;
    
    let fat = (response.precoLimpo && vNum) ? Math.round(response.precoLimpo * vNum * 100) / 100 : 0;
    let relevacaosolo = "Baixa";
    if (fat >= 40000) relevacaosolo = "Alta";
    else if (fat >= 15000) relevacaosolo = "Média";

    response.vendas = vTexto;
    response.vendasNumero = vNum;
    response.faturamentoEstimado = fat;
    response.relevancia = relevacaosolo;
    response.marketplace = mercadoDetectado;
    response.posicao = response.posicao || 1;
    response.ads = response.ads || 'N';
    response.url = response.url || tab.url;
    response.concorrente = response.concorrente || '';

    dadosAtuais = response;
    
    document.getElementById('prod-titulo').innerText = response.titulo || 'Não detectado';
    document.getElementById('prod-preco').innerText = response.preco || 'Não detectado';
    document.getElementById('prod-vendas').innerText = response.vendas || 'Zero ou não informado';
    document.getElementById('prod-vendedor').innerText = response.vendedor || 'Não detectado';
    document.getElementById('prod-frete').innerText = response.frete || 'Padrão / Não identificado';
    
    if(response.precoLimpo) {
      document.getElementById('v-venda').value = response.precoLimpo;
    }
    document.getElementById('btn-salvar-concorrente').style.display = 'block';

    chrome.storage.local.get(['concorrentes'], (res) => {
      const list = res.concorrentes || [];
      const jaExiste = response.url
        ? list.some(item => item.url === response.url)
        : list.some(item => item.titulo === response.titulo && item.preco === response.preco);
      
      if(!jaExiste) {
        list.unshift({
          titulo: response.titulo, preco: response.preco, precoLimpo: response.precoLimpo,
          vendas: response.vendas, vendasNumero: response.vendasNumero, faturamentoEstimado: response.faturamentoEstimado,
          posicao: response.posicao, avaliacaoNota: response.avaliacaoNota || null, avaliacaoQtd: response.avaliacaoQtd || null,
          vendedor: response.vendedor, frete: response.frete, freteDetalhe: response.freteDetalhe || null,
          url: response.url, marketplace: response.marketplace, data: new Date().toLocaleDateString('pt-BR'),
          relevancia: response.relevancia, ads: response.ads, concorrente: response.concorrente
        });
        chrome.storage.local.set({ concorrentes: list }, () => {
          atualizarListaConcorrentes();
        });
      }
    });
  });
});

document.getElementById('btn-salvar-concorrente').addEventListener('click', () => {
  if(!dadosAtuais) return;
  chrome.storage.local.get(['concorrentes'], (res) => {
    const list = res.concorrentes || [];
    const jaExiste = dadosAtuais.url ? list.some(item => item.url === dadosAtuais.url) : list.some(item => item.titulo === dadosAtuais.titulo && item.preco === dadosAtuais.preco);
    if(!jaExiste) {
      list.unshift({
        titulo: dadosAtuais.titulo, preco: dadosAtuais.preco, precoLimpo: dadosAtuais.precoLimpo,
        vendas: dadosAtuais.vendas, vendasNumero: dadosAtuais.vendasNumero, faturamentoEstimado: dadosAtuais.faturamentoEstimado,
        posicao: dadosAtuais.posicao, avaliacaoNota: dadosAtuais.avaliacaoNota || null, avaliacaoQtd: dadosAtuais.avaliacaoQtd || null,
        vendedor: dadosAtuais.vendedor, frete: dadosAtuais.frete, freteDetalhe: dadosAtuais.freteDetalhe || null,
        url: dadosAtuais.url, marketplace: dadosAtuais.marketplace, data: new Date().toLocaleDateString('pt-BR'),
        relevancia: dadosAtuais.relevancia, ads: dadosAtuais.ads, concorrente: dadosAtuais.concorrente || ''
      });
      chrome.storage.local.set({ concorrentes: list }, () => {
        atualizarListaConcorrentes();
        alert('Concorrente fixado na base de dados!');
      });
    } else {
      alert('Este anúncio já está catalogado.');
    }
  });
});

const atualizarListaConcorrentes = () => {
  chrome.storage.local.get(['concorrentes'], (res) => {
    let list = res.concorrentes || [];
    const container = document.getElementById('lista-concorrentes');
    container.innerHTML = '';
    
    if (filtrandoApenasConcorrentes) {
      list = list.filter(item => item.concorrente && item.concorrente.trim() !== '');
    }

    if(list.length === 0) {
      container.innerHTML = `<div style="color:#718096; text-align:center; padding:10px; font-size:11px;">
        ${filtrandoApenasConcorrentes ? 'Nenhum concorrente principal destacado.' : 'Nenhum concorrente cadastrado.'}
      </div>`;
      return;
    }
    
    list.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'item-salvo';
      
      const isFreteGratis = item.frete && item.frete.toLowerCase().includes('grátis');
      const freteBadge = isFreteGratis ? `<span class="badge-frete">F. Grátis</span>` : '';
      const vendasBadge = item.vendas ? `<span class="badge-vendas">${item.vendas}</span>` : '';
      const badgeAds = item.ads === 'S' || item.ads === 'true' ? '<span style="background:#ecc94b; color:#744210; padding:1px 4px; border-radius:3px; font-size:9px; font-weight:bold;">ADS</span>' : '<span style="background:#edf2f7; color:#4a5568; padding:1px 4px; border-radius:3px; font-size:9px; font-weight:bold;">Orgânico</span>';
      
      let corRelevancia = '#e53e3e'; 
      if(item.relevancia === 'Alta') corRelevancia = '#2f855a';
      if(item.relevancia === 'Média') corRelevancia = '#dd6b20';

      const marcadorTop = item.concorrente ? `<span style="color:#ff9800; font-size:11px; margin-left:5px; font-weight:bold;">${item.concorrente}</span>` : '';

      div.innerHTML = `
        <span class="delete-btn" data-idx="${idx}">&times;</span>
        <strong>${item.titulo}</strong> ${marcadorTop}<br>
        Preço: <span style="color:#2b6cb0; font-weight:bold;">${item.preco}</span> | 
        Relevância: <span style="color:${corRelevancia}; font-weight:bold;">${item.relevancia || 'Baixa'}</span> | ${badgeAds}<br>
        Loja/Local: <span style="color:#4a5568;">${item.vendedor || 'Desconhecida'}</span><br>
        ${vendasBadge} ${freteBadge} <span style="color:#a0aec0; font-size:9px;">(${item.data})</span>
      `;
      
      div.querySelector('.delete-btn').addEventListener('click', (e) => {
        const indexRemover = parseInt(e.target.dataset.idx);
        chrome.storage.local.get(['concorrentes'], (atualizado) => {
          let listaCompleta = atualizado.concorrentes || [];
          if (filtrandoApenasConcorrentes) {
            const itemParaRemover = list[indexRemover];
            listaCompleta = listaCompleta.filter(i => i.url !== itemParaRemover.url);
          } else {
            listaCompleta.splice(indexRemover, 1);
          }
          chrome.storage.local.set({ concorrentes: listaCompleta }, atualizarListaConcorrentes);
        });
      });
      container.appendChild(div);
    });
  });
};

document.getElementById('limpar-tudo').addEventListener('click', () => {
  if(confirm('Deseja limpar todo o histórico de concorrentes mapeados?')) {
    chrome.storage.local.set({ concorrentes: [] }, atualizarListaConcorrentes);
  }
});

// --- LÓGICA DE SIMULAÇÃO DE MARGEM (ABA LUCRO) ---
document.getElementById('btn-calcular')?.addEventListener('click', () => {
  const vVenda = parseFloat(document.getElementById('v-venda').value) || 0;
  const vCusto = parseFloat(document.getElementById('v-custo').value) || 0;
  const vFixo = parseFloat(document.getElementById('v-fixo').value) || 0;
  
  const resCalc = document.getElementById('res-calc');
  
  if (vVenda <= 0 || vCusto <= 0) {
    resCalc.innerHTML = "Insira o Preço de Venda e Custo de Aquisição válidos.";
    resCalc.style.borderLeftColor = "#cbd5e0";
    return;
  }

  const comissaoMkt = vVenda * 0.14; 
  const totalCustos = vCusto + vFixo + comissaoMkt;
  const lucroBruto = vVenda - totalCustos;
  const margemLucro = (lucroBruto / vVenda) * 100;

  let corBorda = "#2f855a";
  if (margemLucro < 0) corBorda = "#e53e3e";
  else if (margemLucro < 15) corBorda = "#dd6b20";

  resCalc.style.borderLeftColor = corBorda;
  resCalc.innerHTML = `
    <strong>Custos Estimados:</strong> R$ ${totalCustos.toFixed(2)} (Aquisição + Adicionais + Comissões)<br>
    <strong>Lucro Bruto por Unidade:</strong> <span style="color:${corBorda}; font-weight:bold;">R$ ${lucroBruto.toFixed(2)}</span><br>
    <strong>Margem Real Resultante:</strong> <span style="color:${corBorda}; font-weight:bold;">${margemLucro.toFixed(1)}%</span>
  `;
});

atualizarListaConcorrentes();