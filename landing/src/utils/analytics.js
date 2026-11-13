// landing/src/utils/analytics.js

export const loadYandexMetrika = () => {
  const metrikaId = import.meta.env.VITE_YANDEX_METRIKA_ID;

  // Если ID не задан в .env (например, у клиента пока нет Метрики), ничего не грузим
  if (!metrikaId || metrikaId === 'undefined') {
    console.log('[Analytics] Yandex Metrika ID is not configured.');
    return;
  }

  // Проверяем, не загружен ли уже скрипт (защита от дублей)
  if (document.getElementById('yandex-metrika-script')) return;

  console.log(`[Analytics] Loading Yandex Metrika with ID: ${metrikaId}`);

  // Создаем скрипт динамически
  const script = document.createElement('script');
  script.id = 'yandex-metrika-script';
  script.type = 'text/javascript';
  script.async = true;
  script.innerHTML = `
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    ym(${metrikaId}, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true,
        webvisor:true
    });
  `;
  document.head.appendChild(script);
};