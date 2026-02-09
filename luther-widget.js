/* ================================================
   Luther AI Chat Widget — deanreynolds.com
   Load via: <script src="/assets/luther-widget.js" defer></script>
   ================================================ */
(function () {
  if (document.getElementById('luther-widget-root')) return;

  var EMBED = 'https://luther-publishing-guide.lovable.app/embed';
  var GOLD = '#F5C400';

  var css = [
    '#luther-widget-root *{box-sizing:border-box;margin:0;padding:0;}',
    '#luther-bubble{position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;align-items:center;gap:8px;background:' + GOLD + ';color:#000;border:none;border-radius:50px;padding:14px 22px;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 24px rgba(0,0,0,0.25);transition:transform .2s,box-shadow .2s;line-height:1;}',
    '#luther-bubble:hover{transform:scale(1.06);box-shadow:0 6px 32px rgba(0,0,0,0.35);}',
    '#luther-bubble svg{flex-shrink:0;}',
    '#luther-panel{display:none;position:fixed;z-index:2147483646;bottom:90px;right:24px;width:400px;height:580px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.45);}',
    '#luther-panel.open{display:block;}',
    '#luther-panel-hdr{background:#201F5B;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;font-family:Inter,system-ui,sans-serif;font-size:14px;font-weight:600;}',
    '#luther-panel-x{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:2px 8px;border-radius:6px;line-height:1;}',
    '#luther-panel-x:hover{background:rgba(255,255,255,0.15);}',
    '#luther-panel iframe{width:100%;height:calc(100% - 48px);border:none;display:block;}',
    '@media(max-width:480px){#luther-panel{width:calc(100vw - 16px);right:8px;bottom:90px;height:70vh;max-height:560px;}#luther-bubble{padding:12px 16px;font-size:14px;bottom:18px;right:16px;}}'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = 'luther-widget-root';
  root.innerHTML =
    '<button id="luther-bubble" aria-label="Ask Luther">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      'Ask Luther' +
    '</button>' +
    '<div id="luther-panel">' +
      '<div id="luther-panel-hdr">' +
        '<span>\uD83E\uDD16 Luther AI Assistant</span>' +
        '<button id="luther-panel-x">\u00D7</button>' +
      '</div>' +
      '<iframe src="' + EMBED + '" title="Luther AI Assistant" loading="lazy" allow="microphone; camera"></iframe>' +
    '</div>';

  document.body.appendChild(root);

  var bubble = document.getElementById('luther-bubble');
  var panel  = document.getElementById('luther-panel');
  var xbtn   = document.getElementById('luther-panel-x');

  bubble.addEventListener('click', function (e) { e.stopPropagation(); panel.classList.toggle('open'); });
  xbtn.addEventListener('click', function (e) { e.stopPropagation(); panel.classList.remove('open'); });
  document.addEventListener('click', function (e) {
    if (panel.classList.contains('open') && !panel.contains(e.target) && !bubble.contains(e.target)) {
      panel.classList.remove('open');
    }
  });
})();
