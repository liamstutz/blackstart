import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {tools,callTool} from './tools.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const VERSION='2025-11-25';
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
export function createServer() {
  return http.createServer(async(req,res)=>{
    const host=req.headers.host;
    if(!host || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return json(res,403,{error:'Local host required'});
    const origin=req.headers.origin;
    if(origin && origin!==`http://${host}`) return json(res,403,{error:'Origin not allowed'});
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const url=new URL(req.url,`http://${host}`);
    if(url.pathname==='/mcp') {
      if(req.method!=='POST'){res.writeHead(405,{Allow:'POST'});return res.end();}
      if(!(req.headers['content-type']??'').includes('application/json')) return json(res,415,{error:'Use application/json'});
      const accept=req.headers.accept??'';
      if(!accept.includes('application/json') || !accept.includes('text/event-stream')) return json(res,406,{error:'Accept both application/json and text/event-stream'});
      let body='';
      try {
        for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>65536){json(res,413,{error:'Request too large'});req.resume();return;}}
      }catch{return json(res,400,{error:'Unreadable body'});}
      let rpc;
      try{rpc=JSON.parse(body);}catch{return json(res,400,{jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}
      if(!rpc || Array.isArray(rpc) || rpc.jsonrpc!=='2.0' || typeof rpc.method!=='string') return json(res,400,{jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid request'}});
      const reply=(result)=>json(res,200,{jsonrpc:'2.0',id:rpc.id,result});
      const err=(code,message)=>json(res,200,{jsonrpc:'2.0',id:rpc.id??null,error:{code,message}});
      const headerVersion=req.headers['mcp-protocol-version'];
      if(headerVersion && headerVersion!==VERSION) return json(res,400,{error:'Unsupported MCP protocol version'});
      if(rpc.id===undefined){res.writeHead(202);return res.end();}
      if(!['string','number'].includes(typeof rpc.id))return err(-32600,'Invalid request id');
      if(rpc.method==='initialize')return reply({protocolVersion:VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'blackstart',version:'1.0.0'},instructions:'Read-only energy estimates using user-provided assumptions. Preserve protected loads. Do not claim restoration times, verified appliance data, medical suitability, or device control. Use spokenSummary for a concise answer.'});
      if(rpc.method==='ping')return reply({});
      if(rpc.method==='tools/list')return reply({tools});
      if(rpc.method==='tools/call') {
        if(typeof rpc.params?.name!=='string')return err(-32602,'Tool name required');
        if(!tools.some(t=>t.name===rpc.params.name)) return err(-32602,'Unknown tool');
        try{return reply(callTool(rpc.params.name,rpc.params.arguments));}
        catch(e){return reply({content:[{type:'text',text:e.message}],isError:true});}
      }
      return err(-32601,'Method not found');
    }
    if(req.method!=='GET' && req.method!=='HEAD')return json(res,405,{error:'Method not allowed'});
    const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css','/icon.svg':'icon.svg'};
    if(!files[url.pathname])return json(res,404,{error:'Not found'});
    try {
      const data=await fs.readFile(path.join(root,files[url.pathname]));
      const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[path.extname(files[url.pathname])];
      res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
    }catch{json(res,500,{error:'Asset unavailable'});}
  });
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT??4173);
  createServer().listen(port,'127.0.0.1',()=>console.log(`Blackstart ready: http://127.0.0.1:${port} — MCP: /mcp (${VERSION})`));
}
