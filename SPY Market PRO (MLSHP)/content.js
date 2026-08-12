// ============================================================================
// 1. INJEÇÃO DO ÍCONE NO HEADER E MODAL FLOATING CLEAN (PANEL ANALÍTICO)
// ============================================================================
function injetarIconeHeader() {
  const cartButton = document.querySelector('#nav-cart');

  if (cartButton && !document.querySelector('.radar-ml-shopee-menu')) {
    const iconUrl = chrome.runtime.getURL('icons/extension/32.png');

    const menuWrapper = document.createElement('div');
    menuWrapper.className = 'radar-ml-shopee-menu';
    menuWrapper.style.cssText = 'display: flex; align-items: center; padding: 0 8px; cursor: pointer;';
    
    menuWrapper.innerHTML = `
      <div class="radar-menu-surface" style="position: relative; display: flex; align-items: center; background: #ffffff; border-radius: 50%; padding: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
        <span class="radar-menu-icon-html">
          <img src="${iconUrl}" width="20" height="20" alt="Radar ML-Shopee" style="display: block;">
        </span>
        <span class="radar-menu-dot" style="position: absolute; top: 0; right: 0; width: 8px; height: 8px; background-color: #22c55e; border-radius: 50%; border: 1.5px solid #fff;"></span>
      </div>
    `;

    cartButton.parentNode.insertBefore(menuWrapper, cartButton.nextSibling);

    menuWrapper.addEventListener('click', () => {
      alternarPainelAnalitico();
    });
  }
}

function alternarPainelAnalitico() {
  let painel = document.getElementById('radar-analytics-drawer');

  if (painel) {
    painel.style.display = (painel.style.display === 'none') ? 'block' : 'none';
    if (painel.style.display === 'block') atualizarDadosPainel();
    return;
  }

  // Modal Flutuante Clean (Descolado, Bordas 20px, Fundo Branco)
  painel = document.createElement('div');
  painel.id = 'radar-analytics-drawer';
  painel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    bottom: 20px;
    width: 410px;
    background: #ffffff;
    color: #0f172a;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0,0,0,0.05);
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
    padding: 20px;
    box-sizing: border-box;
    overflow-y: auto;
    display: block;
    border-radius: 20px;
  `;

  document.body.appendChild(painel);
  atualizarDadosPainel();
}

function atualizarDadosPainel() {
  const painel = document.getElementById('radar-analytics-drawer');
  if (!painel) return;

  const marketplace = detectarMarketplace();
  const itens = marketplace === 'shopee' ? extrairVitrineShopee() : extrairVitrineML();

  if (!itens || itens.length === 0) {
    painel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:16px;">
        <h3 style="margin:0; font-size:16px; font-weight:700; color:#0284c7;">📊 Radar Analytics</h3>
        <button id="radar-close-btn" style="background:none; border:none; color:#64748b; font-size:20px; cursor:pointer;">✕</button>
      </div>
      <p style="margin-top:20px; color:#64748b; font-size:13px;">Nenhum anúncio mapeado nesta página. Certifique-se de estar em uma página de buscas ou categoria.</p>
    `;
    document.getElementById('radar-close-btn')?.addEventListener('click', () => painel.style.display = 'none');
    return;
  }

  // Métricas Consolidadas
  let fatTotal = 0;
  let somaPreco = 0;
  let qtdAds = 0;
  let qtdValidos = 0;
  let maxPreco = 0;
  let minPreco = Infinity;
  let freteGratisQtd = 0;

  itens.forEach(it => {
    if (it.faturamentoEstimado) fatTotal += it.faturamentoEstimado;
    if (it.precoLimpo) {
      somaPreco += it.precoLimpo;
      qtdValidos++;
      if (it.precoLimpo > maxPreco) maxPreco = it.precoLimpo;
      if (it.precoLimpo < minPreco) minPreco = it.precoLimpo;
    }
    if (it.ads === 'S') qtdAds++;
    if (it.frete === 'Frete Grátis') freteGratisQtd++;
  });

  const precoMedio = qtdValidos > 0 ? (somaPreco / qtdValidos) : 0;
  const percAds = Math.round((qtdAds / itens.length) * 100);
  const percFreteGratis = Math.round((freteGratisQtd / itens.length) * 100);

  // Top 5 Faturamento
  const topFaturamento = [...itens]
    .filter(i => i.faturamentoEstimado > 0)
    .sort((a, b) => b.faturamentoEstimado - a.faturamentoEstimado)
    .slice(0, 5);

  const maiorFat = topFaturamento[0]?.faturamentoEstimado || 1;

  // Análise de Curva ABC (Concentração do Top 3 vs Resto)
  const fatTop3 = topFaturamento.slice(0, 3).reduce((acc, curr) => acc + (curr.faturamentoEstimado || 0), 0);
  const concentracaoMercado = fatTotal > 0 ? Math.round((fatTop3 / fatTotal) * 100) : 0;

  painel.innerHTML = `
    <!-- Header Modal Clean -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:12px; margin-bottom:16px;">
      <div>
        <h3 style="margin:0; font-size:16px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:6px;">
          <span style="background:#e0f2fe; color:#0284c7; padding:4px 8px; border-radius:8px; font-size:14px;">📊</span>
          Radar Analytics
        </h3>
        <span style="font-size:11px; color:#64748b; margin-top:2px; display:block;">Inteligência de Mercado em Tempo Real</span>
      </div>
      <button id="radar-close-btn" style="background:#f1f5f9; border:none; color:#64748b; font-size:16px; width:28px; height:28px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
    </div>

    <!-- Cards Principais de KPIs -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:16px;">
      <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0;">
        <span style="font-size:11px; font-weight:600; color:#64748b;">FATURAMENTO TOTAL</span>
        <div style="font-size:16px; font-weight:800; color:#16a34a; margin-top:4px;">
          R$ ${fatTotal.toLocaleString('pt-BR')}
        </div>
      </div>
      <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0;">
        <span style="font-size:11px; font-weight:600; color:#64748b;">PREÇO MÉDIO (TICKET)</span>
        <div style="font-size:16px; font-weight:800; color:#0284c7; margin-top:4px;">
          R$ ${precoMedio.toFixed(2).replace('.', ',')}
        </div>
      </div>
    </div>

    <!-- Mini Indicadores de Competitividade -->
    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-bottom:16px;">
      <div style="background:#f8fafc; padding:8px 10px; border-radius:10px; border:1px solid #e2e8f0; text-align:center;">
        <span style="font-size:10px; color:#64748b; display:block;">Preço Mín/Máx</span>
        <span style="font-size:11px; font-weight:700; color:#334155;">R$ ${minPreco !== Infinity ? minPreco : 0} - ${maxPreco}</span>
      </div>
      <div style="background:#f8fafc; padding:8px 10px; border-radius:10px; border:1px solid #e2e8f0; text-align:center;">
        <span style="font-size:10px; color:#64748b; display:block;">Frete Grátis</span>
        <span style="font-size:11px; font-weight:700; color:#2563eb;">${percFreteGratis}%</span>
      </div>
      <div style="background:#f8fafc; padding:8px 10px; border-radius:10px; border:1px solid #e2e8f0; text-align:center;">
        <span style="font-size:10px; color:#64748b; display:block;">Domínio Top 3</span>
        <span style="font-size:11px; font-weight:700; color:#d97706;">${concentracaoMercado}%</span>
      </div>
    </div>

    <!-- Gráfico 1: Pressão de Patrocinados vs Orgânicos -->
    <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; margin-bottom:8px; color:#334155;">
        <span>PRESENÇA DE ADS (PATROCINADOS)</span>
        <span style="color:#e11d48;">${percAds}% dos Anúncios</span>
      </div>
      <div style="width:100%; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden; display:flex;">
        <div style="width:${percAds}%; background:#f43f5e; height:100%; title:'Anúncios Ads';"></div>
        <div style="width:${100 - percAds}%; background:#10b981; height:100%; title:'Anúncios Orgânicos';"></div>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-top:6px;">
        <span style="display:flex; align-items:center; gap:4px;"><span style="width:6px; height:6px; background:#f43f5e; border-radius:50%; display:inline-block;"></span> Ads (${qtdAds})</span>
        <span style="display:flex; align-items:center; gap:4px;"><span style="width:6px; height:6px; background:#10b981; border-radius:50%; display:inline-block;"></span> Orgânico (${itens.length - qtdAds})</span>
      </div>
    </div>

    <!-- Gráfico 2: Top 5 Faturamento Estruturado -->
    <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:16px;">
      <h4 style="font-size:11px; text-transform:uppercase; color:#475569; margin:0 0 12px 0; font-weight:700; letter-spacing:0.5px;">
        🏆 Top 5 Maiores Faturamentos
      </h4>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${topFaturamento.length === 0 ? '<span style="font-size:12px; color:#94a3b8;">Nenhum faturamento expressivo detectado.</span>' : ''}
        ${topFaturamento.map((item, idx) => {
          const perc = Math.round((item.faturamentoEstimado / maiorFat) * 100);
          return `
            <div style="font-size:11px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:600;">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:210px; color:#1e293b;" title="${item.titulo}">
                  ${idx + 1}. ${item.titulo}
                </span>
                <span style="color:#16a34a; font-weight:700;">R$ ${item.faturamentoEstimado.toLocaleString('pt-BR')}</span>
              </div>
              <div style="width:100%; background:#e2e8f0; height:6px; border-radius:3px; overflow:hidden;">
                <div style="width:${perc}%; background:#0284c7; height:100%; border-radius:3px;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Insight Estratégico Rápido -->
    <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:10px 12px; border-radius:10px; font-size:11px; color:#1e40af; line-height:1.4;">
      <strong>💡 Diagnostic do Nicho:</strong> Mercado 
      ${concentracaoMercado > 60 ? '<b>altamente concentrado</b> nos top players.' : '<b>pulverizado</b>, excelente oportunidade para validação de produto.'}
      ${percAds > 40 ? ' Alta concorrência de Ads na página principal.' : ' Baixa concorrência em anúncios pagos.'}
    </div>
  `;

  document.getElementById('radar-close-btn')?.addEventListener('click', () => {
    painel.style.display = 'none';
  });
}

// Executa na carga da página e através do MutationObserver para páginas dinâmicas
injetarIconeHeader();
const observerHeader = new MutationObserver(() => {
  injetarIconeHeader();
});
observerHeader.observe(document.body, { childList: true, subtree: true });


// ============================================================================
// 2. LISTENERS DE MENSAGENS E EXTRAÇÃO DE DADOS
// ============================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extrair_dados") {
    let ehPaginaProduto = !!document.querySelector('.ui-pdp-price__second-line, .ui-pdp-container');
    
    if (!ehPaginaProduto) {
      const itensVitrine = extrairVitrineML();
      let melhorItem = null;
      let melhorScore = -1;

      itensVitrine.forEach(item => {
        let fat = item.faturamentoEstimado || 0;
        let pesoOrg = item.ads === 'N' ? 1.2 : 1.0;
        
        let ehKitDistorcido = /kit|combo|acessório/i.test(item.titulo) && (item.precoLimpo > 150);
        if (ehKitDistorcido) pesoOrg = 0.3;

        let score = fat * pesoOrg;
        if (score > melhorScore && fat > 0) {
          melhorScore = score;
          melhorItem = item;
        }
      });

      if (melhorItem) {
        sendResponse({
          titulo: melhorItem.titulo,
          preco: melhorItem.preco,
          precoLimpo: melhorItem.precoLimpo,
          vendas: melhorItem.vendas,
          vendedor: melhorItem.vendedor || "Visualizado na Vitrine",
          frete: melhorItem.frete,
          url: melhorItem.url,
          ads: melhorItem.ads,
          concorrente: melhorItem.concorrente,
          marca: melhorItem.marca || "Não informado",
          comissaoR$: melhorItem.comissaoR$ || 0,
          taxaCategoria: melhorItem.taxaCategoria || "0%",
        });
        return true;
      }
    }

    let titulo = document.querySelector('h1')?.innerText?.trim() || document.title;
    let seletorPreco = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction') ||
                       document.querySelector('[class*="price-actual"], .ui-pdp-price__part, .a-price-whole');
    let precoTexto = '-';
    let precoLimpo = '';

    if (seletorPreco) {
      precoTexto = seletorPreco.innerText.trim();
      let seletorCentavos = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__cents');
      if (seletorCentavos && seletorCentavos.innerText) {
        precoTexto += ',' + seletorCentavos.innerText.trim();
      } else {
        precoTexto = "R$ " + precoTexto;
      }
      precoLimpo = precoTexto.replace(/[^\d,,.]/g, '').replace(',', '.');
    }

    let vendasTexto = '';
    let seletorVendas = document.querySelector('.ui-pdp-subtitle, .ui-pdp-header__subtitle, [class*="subtitle"], [class*="sales"]');
    if (seletorVendas) {
      let textoCru = seletorVendas.innerText;
      let matchVendas = textoCru.match(/(\+?\d+[\d\s\.]*\s*(mil|k)?\s*vendido(s)?)/i);
      if (matchVendas) {
        vendasTexto = matchVendas[0].trim();
      }
    }

    let sellerTexto = '';
    let seletorVendedor = document.querySelector('.ui-pdp-seller__link-trigger, .ui-seller-info__title, [class*="seller-name"], .ui-pdp-vtex-seller-link');
    if (seletorVendedor) {
      sellerTexto = seletorVendedor.innerText.replace(/Ver mais dados de/i, '').trim();
    }

    let freteTexto = 'Pago / Não informado';
    let corpoTexto = document.body.innerText;
    if (/frete\s+grátis/i.test(corpoTexto) || document.querySelector('.ui-pdp-shipping__title--highlight, [class*="free-shipping"]')) {
      freteTexto = 'Frete Grátis';
    }

    let marcaTexto = "Não informado";
    let elMarca = document.querySelector('.ui-pdp-specs__table tr:nth-child(1) td');
    if(elMarca) marcaTexto = elMarca.innerText.trim();

    sendResponse({
      titulo: limparTexto(titulo).substring(0, 70),
      preco: precoTexto.includes('R$') ? precoTexto : "R$ " + precoTexto,
      precoLimpo: parseFloat(precoLimpo) || null,
      vendas: vendasTexto || null,
      vendedor: sellerTexto ? limparTexto(sellerTexto) : null,
      frete: freteTexto,
      url: window.location.href,
      ads: /patrocinado/i.test(corpoTexto) ? 'S' : 'N',
      concorrente: '',
      marca: marcaTexto,
      comissaoR$: 0,
      taxaCategoria: "0%"
    });
  }

  if (request.action === "extrair_vitrine") {
    const marketplaceStr = detectarMarketplace();
    const itens = marketplaceStr === 'shopee' ? extrairVitrineShopee() : extrairVitrineML();
    
    injetarBadges(itens);
    
    const itensProcessados = itens.map(it => {
      const clone = { ...it };
      delete clone._cardEl;
      return clone;
    });

    sendResponse({ marketplace: marketplaceStr, itens: itensProcessados });
  }

  return true;
});

// ============================================================================
// 3. FUNÇÕES AUXILIARES DE SUPORTE
// ============================================================================
function descobrirPaginaAtual() {
  const url = window.location.href;
  if (url.includes('mercadolivre') || url.includes('mercadolibre')) {
    const match = url.match(/_Desde_(\d+)/);
    if (!match) return "Page1";
    const desde = parseInt(match[1], 10);
    return "Page" + (Math.floor((desde - 1) / 48) + 1);
  }
  if (url.includes('shopee')) {
    const match = url.match(/pageNumber=(\d+)/);
    if (!match) return "Page1";
    return "Page" + (parseInt(match[1], 10) + 1);
  }
  return "Page1";
}

function detectarMarketplace() {
  const host = window.location.hostname;
  if (host.includes('shopee')) return 'shopee';
  if (host.includes('mercadolivre') || host.includes('mercadolibre')) return 'mercado_livre';
  return 'desconhecido';
}

function limparTexto(txt) {
  return (txt || '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function extrairVitrineML() {
  const cards = document.querySelectorAll('.ui-search-layout__item, li.ui-search-layout__item, div.poly-card:not(.poly-card--regard)');
  const itens = [];

  cards.forEach((card, idx) => {
    if (card.parentElement && card.parentElement.classList.contains('poly-card__content')) return;

    const elTitulo = card.querySelector('.poly-component__title, .ui-search-item__title, h2, h3');
    const elLink = card.querySelector('a.poly-component__title, a.ui-search-link, a.ui-search-item__group__element');
    const elPrecoInt = card.querySelector('.poly-price__current .andes-money-amount__fraction, .ui-search-price__second-line .andes-money-amount__fraction');
    const elPrecoCent = card.querySelector('.poly-price__current .andes-money-amount__cents, .ui-search-price__second-line .andes-money-amount__cents');
    const elAvaliacaoNota = card.querySelector('.poly-reviews__rating, .ui-search-reviews__rating-number, .poly-component__review-compacted .polylabel-label:nth-of-type(1)');
    const elFrete = card.querySelector('[class*="shipping"], .poly-component__shipping-v2');
    
    const elLocalML = card.querySelector('.ui-search-item__location, .poly-component__seller, .ui-search-item__group__element.ui-search-item__location');
    let localTexto = elLocalML ? elLocalML.innerText.trim() : null;

    let elAvaliacaoQtd = card.querySelector('.poly-reviews__total, .ui-search-reviews__amount');
    const textoCard = card.innerText || '';
    const matchVendas = textoCard.match(/(\+?\d+[\d\s\.]*\s*vendido(s)?)/i);
    const temFreteGratis = /frete\s+gr[aá]tis/i.test(textoCard) || !!card.querySelector('[class*="shipping"][class*="highlight"]');

    if (!elTitulo || !elPrecoInt) return;

    const urlProduto = elLink ? elLink.href : '';
    const ehAdsML = !!card.querySelector('.poly-component__advertising') || 
                    !!card.querySelector('.poly-component__ads-promotions') || 
                    urlProduto.includes('is_advertising=true') ||
                    urlProduto.includes('/mclics/') ||
                    /patrocinado/i.test(textoCard);

    let precoLimpo = elPrecoInt.innerText.replace(/\D/g, '');
    if (elPrecoCent && elPrecoCent.innerText) precoLimpo += '.' + elPrecoCent.innerText.replace(/\D/g, '');
    precoLimpo = parseFloat(precoLimpo) || null;

    let vendasNumero = null;
    if (matchVendas) {
      const digitos = matchVendas[0].replace(/[^\d]/g, '');
      vendasNumero = digitos ? parseInt(digitos, 10) : null;
    }
    const faturamentoEstimado = (precoLimpo && vendasNumero) ? Math.round(precoLimpo * vendasNumero * 100) / 100 : null;

    if (!localTexto) {
      if (/internacional/i.test(textoCard)) localTexto = 'Internacional';
      else if (/s[aã]o\s+paulo/i.test(textoCard)) localTexto = 'São Paulo';
      else if (/paran[aá]/i.test(textoCard)) localTexto = 'Paraná';
      else localTexto = 'Não informado';
    }

    let taxaCategoriaEst = "14%"; 
    let comissaoCalc = precoLimpo ? Math.round((precoLimpo * 0.14) * 100) / 100 : 0;

    itens.push({
      cardId: 'ml_' + idx,
      posicao: idx + 1,
      titulo: limparTexto(elTitulo.innerText).substring(0, 90),
      preco: 'R$ ' + elPrecoInt.innerText.trim() + (elPrecoCent ? ',' + elPrecoCent.innerText.trim() : ''),
      precoLimpo,
      vendas: matchVendas ? matchVendas[0].trim() : null,
      vendasNumero,
      faturamentoEstimado,
      avaliacaoNota: elAvaliacaoNota ? limparTexto(elAvaliacaoNota.innerText) : null,
      avaliacaoQtd: elAvaliacaoQtd ? limparTexto(elAvaliacaoQtd.innerText) : (matchVendas ? matchVendas[0].trim() : null),
      vendedor: localTexto, 
      frete: temFreteGratis ? 'Frete Grátis' : 'Pago / Não informado',
      freteDetalhe: elFrete ? limparTexto(elFrete.innerText).substring(0, 40) : null,
      url: urlProduto,
      relevancia: 'Analisar',
      ads: ehAdsML ? 'S' : 'N',
      concorrente: '',
      marca: "Mapeado em Anúncio",
      comissaoR$: comissaoCalc,
      taxaCategoria: taxaCategoriaEst,
      _cardEl: card
    });
  });

  return itens;
}

function extrairVitrineShopee() {
  const cards = document.querySelectorAll('div.p-2.flex-1.flex.flex-col, [data-sqe="item"]');
  const itens = [];

  cards.forEach((card, idx) => {
    if (card.querySelector('div.p-2.flex-1.flex.flex-col')) return;

    const elTitulo = card.querySelector('.whitespace-normal.line-clamp-2');
    if (!elTitulo) return;

    const ancestralCard = card.closest('a') || card.querySelector('a') || card.parentElement?.closest('a');
    const urlProduto = ancestralCard ? ancestralCard.href : window.location.href;

    const elPreco = card.querySelector('.text-shopee-primary .truncate.flex.items-baseline');
    let precoTexto = '-';
    let precoLimpo = null;

    if (elPreco) {
      precoTexto = elPreco.innerText.replace('R$', '').trim();
      precoLimpo = parseFloat(precoTexto.replace(/\./g, '').replace(',', '.')) || null;
      precoTexto = "R$ " + precoTexto;
    } else {
      const matchPrecoRegex = card.innerText.match(/R\$\s?[\d.,]+/);
      if (matchPrecoRegex) {
        precoTexto = matchPrecoRegex[0];
        precoLimpo = parseFloat(precoTexto.replace(/[^\d,]/g, '').replace(',', '.')) || null;
      }
    }

    const elVendas = card.querySelector('.truncate.text-shopee-black87');
    let vendasTexto = elVendas ? elVendas.innerText.trim() : null;
    let vendasNumero = null;

    if (vendasTexto) {
      let textoVendasLower = vendasTexto.toLowerCase();
      let multiplicador = 1;
      
      if (textoVendasLower.includes('mil') || textoVendasLower.includes('k')) {
        multiplicador = 1000;
      }
      
      const matchDigitos = textoVendasLower.match(/[\d.,]+/);
      if (matchDigitos) {
        let numeroLimpo = matchDigitos[0].replace(/\./g, '').replace(',', '.');
        vendasNumero = Math.round(parseFloat(numeroLimpo) * multiplicador);
      }
    }

    const elNota = card.querySelector('img[alt="rating-star"] + span');
    const avaliacaoNota = elNota ? elNota.innerText.trim() : null;

    const elLocal = card.querySelector('.text-shopee-black54 span.ml-\\[3px\\]') || card.querySelector('.text-shopee-black54');
    const localTexto = elLocal ? elLocal.innerText.replace(/[\n\r]/g, '').trim() : 'Não informado';

    const ehAdsShopee = !!card.querySelector('[data-sqe="ad"]') || 
                        /patrocinado|^ad$/i.test(card.innerText) || 
                        card.innerText.includes('Ad\n');

    const faturamentoEstimado = (precoLimpo && vendasNumero) ? Math.round(precoLimpo * vendasNumero * 100) / 100 : 0;

    let taxaCategoriaEst = "14%";
    let comissaoCalc = precoLimpo ? Math.round((precoLimpo * 0.14) * 100) / 100 : 0;

    itens.push({
      cardId: 'shopee_' + idx,
      posicao: idx + 1,
      titulo: limparTexto(elTitulo.innerText).substring(0, 90),
      preco: precoTexto,
      precoLimpo,
      vendas: vendasTexto,
      vendasNumero,
      faturamentoEstimado,
      avaliacaoNota,
      avaliacaoQtd: vendasTexto, 
      vendedor: localTexto, 
      frete: /frete\s+gr[aá]tis/i.test(card.innerText) ? 'Frete Grátis' : 'Pago / Ver no Anúncio',
      freteDetalhe: null,
      url: urlProduto,
      relevancia: 'Analisar',
      ads: ehAdsShopee ? 'S' : 'N',
      concorrente: '',
      marca: "Mapeado em Anúncio",
      comissaoR$: comissaoCalc,
      taxaCategoria: taxaCategoriaEst,
      _cardEl: card
    });
  });

  return itens;
}

// ============================================================================
// 4. INJEÇÃO DE BADGES E CARDS NAS VITRINES
// ============================================================================
function injetarBadges(itens) {
  if (!document.getElementById('radar-vitrine-style')) {
    const style = document.createElement('style');
    style.id = 'radar-vitrine-style';
    style.textContent = `
      .ui-search-layout__item, li.ui-search-layout__item, div.poly-card, [data-sqe="item"], .shopee-search-item-result__item {
        overflow: visible !important; position: relative !important; height: auto !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important;
      }
      .poly-card__content { display: flex !important; flex-direction: column !important; flex-grow: 1 !important; justify-content: space-between !important; }
      .radar-badge { 
        margin: 10px 12px 4px 12px; padding: 8px; background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid #a0aec0; font-size: 11px; font-family: Arial, sans-serif; color: #2d3748; border-radius: 4px; line-height: 1.4; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: block !important; z-index: 10;
      }
      .rb-badge-verde { border-left-color: #2f855a !important; background: #f0fff4 !important; }
      .rb-badge-amarelo { border-left-color: #dd6b20 !important; background: #fffaf0 !important; }
      .rb-badge-vermelho { border-left-color: #e53e3e !important; background: #fff5f5 !important; }
      
      .rb-linha-topo { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
      .rb-posicao { display: flex; align-items: center; gap: 4px; background: #edf2f7; color: #4a5568; padding: 1px 5px; border-radius: 3px; font-weight: bold; }
      .rb-faturamento { color: #2f855a; background: #ffffff; padding: 2px 5px; border-radius: 3px; font-weight: bold; border: 1px solid #c6f6d5; }
      .rb-detalhes { color: #4a5568; font-size: 11px; border-top: 1px dashed #e2e8f0; padding-top: 5px; margin-top: 3px; }
      .rb-frete-gratis { color: #2b6cb0; font-weight: bold; background: #ebf8ff; padding: 1px 4px; border-radius: 3px; }
      .rb-tag-status { font-weight: bold; font-size: 10px; padding: 1px 4px; border-radius: 3px; text-transform: uppercase; }
      
      .rb-tag-verde { background: #2f855a; color: white; }
      .rb-tag-amarelo { background: #dd6b20; color: white; }
      .rb-tag-vermelho { background: #e53e3e; color: white; }
      .rb-tag-ads { background: #ecc94b; color: #744210; font-weight: bold; font-size: 9px; padding: 1px 4px; border-radius: 3px; }
      .rb-tag-org { background: #cbd5e0; color: #2d3748; font-weight: bold; font-size: 9px; padding: 1px 4px; border-radius: 3px; }
      
      .rb-estrela-top { color: #ff9800; font-size: 16px; margin-left: 4px; display: inline-block; animation: pulse 2s infinite; }
      @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);
  }

  let melhorScore = -1;
  let idMelhorConcorrente = null;
  const tagPagina = descobrirPaginaAtual();

  itens.forEach(item => {
    let fat = item.faturamentoEstimado || 0;
    let pesoOrg = item.ads === 'N' ? 1.2 : 1.0; 
    
    let ehKitDistorcido = /kit|combo|acessório/i.test(item.titulo) && (item.precoLimpo > 150);
    if (ehKitDistorcido) pesoOrg = 0.3;

    let score = fat * pesoOrg;
    if (score > melhorScore && fat > 0) {
      melhorScore = score;
      idMelhorConcorrente = item.cardId;
    }
  });

  itens.forEach(item => {
    if (!item._cardEl) return;
    
    const badgesAntigos = item._cardEl.querySelectorAll('.radar-badge');
    badgesAntigos.forEach(el => el.remove());

    const badge = document.createElement('div');
    badge.className = 'radar-badge';
    
    let classeBandeira = 'rb-badge-vermelho';
    let textoBandeira = 'Baixa Tração';
    let notaRelevancia = 'Baixa';

    const avaliacoesNum = item.avaliacaoQtd ? parseInt(item.avaliacaoQtd.replace(/[^\d]/g, ''), 10) || 0 : 0;
    const faturamento = item.faturamentoEstimado || 0;

    if (faturamento > 0) {
      if (faturamento >= 40000 && avaliacoesNum < 200) {
        classeBandeira = 'rb-badge-verde';
        textoBandeira = 'Ideal';
        notaRelevancia = 'Alta';
      } else if (faturamento >= 15000) {
        classeBandeira = 'rb-badge-amarelo';
        textoBandeira = 'Competitivo';
        notaRelevancia = 'Média';
      } else {
        classeBandeira = 'rb-badge-vermelho';
        textoBandeira = 'Baixa Tração';
        notaRelevancia = 'Baixa';
      }
    } else if (item.vendasNumero && item.vendasNumero > 0) {
      classeBandeira = 'rb-badge-amarelo';
      textoBandeira = 'Analisar Preço';
      notaRelevancia = 'Média';
    }

    if (item.cardId === idMelhorConcorrente) {
      item.isTopConcorrente = true;
      item.concorrente = `★ Concorrente ${tagPagina}`;
      textoBandeira = `Concorrente ${tagPagina}`;
      classeBandeira = 'rb-badge-verde'; 
      notaRelevancia = 'Alta';
    } else {
      item.isTopConcorrente = false;
      item.concorrente = ''; 
    }

    item.relevancia = notaRelevancia;
    badge.classList.add(classeBandeira);

    const fatFormatado = faturamento > 0 ? `R$ ${faturamento.toLocaleString('pt-BR')}` : null;
    const badgeAdsVisual = item.ads === 'S' ? '<span class="rb-tag-ads">ADS</span>' : '<span class="rb-tag-org">ORG</span>';
    const estrelaHtml = item.isTopConcorrente ? `<span class="rb-estrela-top">★</span>` : '';

    let htmlBadge = `
      <div class="rb-linha-topo">
        <span class="rb-posicao">#${item.posicao} <span class="rb-tag-status ${classeBandeira.replace('rb-badge', 'rb-tag')}">${textoBandeira}</span> ${badgeAdsVisual} ${estrelaHtml}</span>
        ${fatFormatado ? `<span class="rb-faturamento">Est: ${fatFormatado}</span>` : '<span style="color:#a0aec0">Sem faturamento</span>'}
      </div>
    `;

    const detalhes = [
      `Preço: <b>${item.preco || '-'}</b>`,
      item.vendas ? `🛒 ${item.vendas}` : null,
      item.vendedor ? `🏬 <b>${item.vendedor}</b>` : null,
      item.avaliacaoNota ? `★ ${item.avaliacaoNota}` : null,
      item.frete === 'Frete Grátis' ? `<span class="rb-frete-gratis">Grátis</span>` : `📦 Pago`
    ].filter(Boolean).join(' | ');

    htmlBadge += `<div class="rb-detalhes">${detalhes}</div>`;
    badge.innerHTML = htmlBadge;
    
    item._cardEl.appendChild(badge);
  });
}