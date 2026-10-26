// Assembles full dashboard.html from parts and replaces document
(function(){
  function go(){
    var parts = window.__DASH_HTML_PARTS || [];
    if(parts.length < 3 || !parts[0] || !parts[1] || !parts[2]){
      document.getElementById('boot').innerHTML = '<p style="color:#fff;padding:40px;text-align:center">Caricamento parti Dashboard fallito. <a href="login.html" style="color:#ff4dad">Login</a></p>';
      return;
    }
    var html = parts[0]+parts[1]+parts[2];
    document.open();
    document.write(html);
    document.close();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
