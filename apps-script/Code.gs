/**
 * CATÁLOGO VIRTUAL V1
 * Script vinculado à planilha Google Sheets.
 * - API pública SOMENTE leitura: doGet?action=catalog
 * - Painel administrativo: sidebar dentro da planilha
 * - Funções administrativas exigem que o usuário seja o PROPRIETÁRIO da planilha.
 */

const SHEETS = { products:'Produtos', variants:'Variantes', categories:'Categorias', config:'Config_Catalogo' };
const PUBLIC_CONFIG_KEYS = new Set(['nome_loja','whatsapp','instagram','titulo_hero','subtitulo_hero','texto_whatsapp','moeda','cor_primaria']);

function onOpen(){
  const active=SpreadsheetApp.getActive();
  if(active) PropertiesService.getScriptProperties().setProperty('SHEET_ID',active.getId());
  SpreadsheetApp.getUi().createMenu('🛍️ CATÁLOGO')
    .addItem('➕ Cadastrar produto','showCatalogAdmin')
    .addItem('🔄 Atualizar menu','onOpen')
    .addToUi();
}

function showCatalogAdmin(){
  assertOwner_();
  const html = HtmlService.createHtmlOutputFromFile('Admin').setTitle('Catálogo • Administração');
  SpreadsheetApp.getUi().showSidebar(html);
}

function doGet(e){
  try{
    const action = String((e && e.parameter && e.parameter.action) || 'catalog').toLowerCase();
    if(action !== 'catalog') return json_({ok:false,error:'Ação não disponível.'});
    return json_(buildPublicCatalog_());
  }catch(err){
    return json_({ok:false,error:String(err && err.message || err)});
  }
}

function buildPublicCatalog_(){
  const ss=getSS_();
  const config=readConfig_(ss);
  const ps=ss.getSheetByName(SHEETS.products), vs=ss.getSheetByName(SHEETS.variants);
  if(!ps || !vs) throw new Error('Abas Produtos/Variantes não encontradas.');

  const pValues=ps.getDataRange().getValues(); const vValues=vs.getDataRange().getValues();
  const ph=indexHeaders_(pValues.shift()); const vh=indexHeaders_(vValues.shift());
  const variantsByProduct={};

  vValues.forEach(row=>{
    const productId=cell_(row,vh,'ID Produto'); if(!productId) return;
    const status=String(cell_(row,vh,'Status')||'Ativo'); if(status==='Inativo') return;
    const size=cell_(row,vh,'Tamanho'); const stock=Number(cell_(row,vh,'Estoque Atual')||0); const price=Number(cell_(row,vh,'Preço de Venda')||0);
    if (!variantsByProduct[productId]) variantsByProduct[productId] = [];
    variantsByProduct[productId].push({size:String(size||''),price:price,stock:stock});
  });

  const products=[];
  pValues.forEach(row=>{
    const id=cell_(row,ph,'ID Produto'); if(!id) return;
    const status=String(cell_(row,ph,'Status')||'Ativo'); const show=String(cell_(row,ph,'Exibir no Catálogo')||'Sim');
    if(status!=='Ativo' || show!=='Sim') return;
    const availability=String(cell_(row,ph,'Disponibilidade')||'Pronta entrega');
    const rawVars=variantsByProduct[id]||[];
    const variants=rawVars
      .filter(v=> availability==='Sob encomenda' ? true : v.stock>0)
      .map(v=>({size:v.size,price:v.price,available:availability==='Sob encomenda' ? true : v.stock>0}));
    if(availability==='Pronta entrega' && variants.length===0) return;

    products.push({
      id:String(id),
      name:String(cell_(row,ph,'Nome / Descrição')||''),
      model:String(cell_(row,ph,'Modelo')||''),
      category:String(cell_(row,ph,'Categoria')||''),
      subcategory:String(cell_(row,ph,'Subcategoria')||''),
      team:String(cell_(row,ph,'Time / Seleção')||''),
      season:String(cell_(row,ph,'Temporada / Ano')||''),
      image:normalizeDriveImage_(String(cell_(row,ph,'Imagem (URL)')||'')),
      availability:availability,
      featured:String(cell_(row,ph,'Destaque')||'Não')==='Sim',
      leadTime:String(cell_(row,ph,'Prazo Encomenda')||''),
      description:String(cell_(row,ph,'Descrição Pública')||''),
      variants:variants
    });
  });

  return {ok:true,version:1,updatedAt:new Date().toISOString(),config:config,products:products};
}

function getAdminBootstrap(){
  assertOwner_();
  const ss=getSS_();
  const cat=ss.getSheetByName(SHEETS.categories).getDataRange().getValues();
  const data={models:[],sizes:[],categories:[],subcategories:[]};
  for(let i=1;i<cat.length;i++){
    if(cat[i][0]) data.models.push(String(cat[i][0]));
    if(cat[i][1]) data.sizes.push(String(cat[i][1]));
    if(cat[i][2]) data.categories.push(String(cat[i][2]));
    if(cat[i][3]) data.subcategories.push(String(cat[i][3]));
  }
  return {ok:true,models:data.models,sizes:data.sizes,categories:data.categories,subcategories:data.subcategories};
}

function saveCatalogProduct(payload){
  assertOwner_();
  if(!payload) throw new Error('Dados do produto não recebidos.');
  const name=clean_(payload.name), model=clean_(payload.model), category=clean_(payload.category), team=clean_(payload.team), season=clean_(payload.season);
  const availability=clean_(payload.availability)||'Pronta entrega'; const sizes=Array.isArray(payload.sizes)?payload.sizes:[];
  const price=Number(payload.price||0), cost=Number(payload.cost||0), freight=Number(payload.freight||0);
  if(!name || !model || !category || !team || !season) throw new Error('Preencha nome, modelo, categoria, time/seleção e temporada.');
  if(!sizes.length) throw new Error('Selecione pelo menos um tamanho.');
  if(availability==='Pronta entrega' && !sizes.some(item=>Number(item.qty||0)>0)) throw new Error('Para pronta entrega, informe estoque maior que zero em pelo menos um tamanho.');
  if(price<=0) throw new Error('Informe um preço de venda válido.');

  const ss=getSS_(); const ps=ss.getSheetByName(SHEETS.products), vs=ss.getSheetByName(SHEETS.variants);
  if(!ps||!vs) throw new Error('Abas Produtos/Variantes não encontradas.');
  const token=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Sao_Paulo','yyMMddHHmmss')+'-'+Math.floor(100+Math.random()*900);
  const id='PROD-'+token; const skuBase=slugSku_(team)+'-'+season.replace(/\D/g,'').slice(0,5)+'-'+slugSku_(model).slice(0,3)+'-'+token.slice(-3);
  const image=normalizeDriveImage_(clean_(payload.image));

  ps.appendRow([
    id,skuBase,name,model,category,clean_(payload.subcategory),team,season,clean_(payload.supplier),new Date(),image,'Ativo','',
    availability,payload.show===false?'Não':'Sim',payload.featured===true?'Sim':'Não',clean_(payload.leadTime),clean_(payload.description)
  ]);

  sizes.forEach(item=>{
    const size=clean_(item.size); if(!size) return;
    const qty=Math.max(0,Number(item.qty||0));
    if(availability==='Pronta entrega' && qty<=0) return;
    const variantId='VAR-'+Utilities.getUuid().slice(0,8).toUpperCase(); const sku=skuBase+'-'+size;
    const row=vs.getLastRow()+1;
    vs.appendRow([variantId,sku,id,size,qty,'', '',cost,freight,'',price,'','Ativo']);
    vs.getRange(row,6).setFormula(`=SUMIF(Vendidos!$F:$F,A${row},Vendidos!$K:$K)`);
    vs.getRange(row,7).setFormula(`=E${row}-F${row}`);
    vs.getRange(row,10).setFormula(`=H${row}+I${row}`);
    vs.getRange(row,12).setFormula(`=G${row}*J${row}`);
  });

  SpreadsheetApp.flush();
  return {ok:true,id:id,message:'Produto cadastrado e publicado no catálogo.'};
}


function getSS_(){
  const props=PropertiesService.getScriptProperties();
  const id=props.getProperty('SHEET_ID');
  if(id) return SpreadsheetApp.openById(id);
  const active=SpreadsheetApp.getActive();
  if(!active) throw new Error('Planilha não configurada. Abra a planilha e recarregue uma vez antes de publicar o Web App.');
  props.setProperty('SHEET_ID',active.getId());
  return active;
}

function assertOwner_(){
  const ss=getSS_();
  let owner='';
  try{ owner=DriveApp.getFileById(ss.getId()).getOwner().getEmail(); }catch(_e){}
  const current=(Session.getActiveUser().getEmail()||Session.getEffectiveUser().getEmail()||'').toLowerCase();
  if(owner && current && owner.toLowerCase()!==current) throw new Error('Apenas o proprietário da planilha pode administrar o catálogo.');
  if(owner && !current) throw new Error('Não foi possível confirmar sua conta. Abra a planilha autenticado como proprietário.');
}

function readConfig_(ss){
  const sh=ss.getSheetByName(SHEETS.config); const out={}; if(!sh) return out;
  const vals=sh.getDataRange().getValues();
  vals.forEach(row=>{const k=String(row[0]||'').trim();if(PUBLIC_CONFIG_KEYS.has(k))out[k]=row[1];});
  return out;
}
function indexHeaders_(headers){const out={};headers.forEach((h,i)=>out[String(h||'').trim()]=i);return out;}
function cell_(row,map,name){const i=map[name];return i===undefined?'':row[i];}
function clean_(v){return String(v==null?'':v).trim();}
function slugSku_(v){return clean_(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'ITEM';}
function normalizeDriveImage_(url){
  if(!url) return '';
  const m=url.match(/\/d\/([a-zA-Z0-9_-]+)/)||url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600` : url;
}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
