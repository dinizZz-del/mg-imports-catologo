(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const state = {
    data: null,
    products: [],
    availability: '',
    category: 'Todos',
    search: '',
    model: '',
    size: '',
    season: '',
    selectedProduct: null,
    selectedSize: ''
  };

  /* =====================================================
     HERO — PRODUTOS RECENTES
     ===================================================== */

  let heroProducts = [];
  let heroIndex = 0;
  let heroTimer = null;

  function productDateKey(product) {
    const id = String(product?.id || '');
    const match = id.match(/PROD-(\d{12})/);

    return match ? match[1] : '';
  }

  function getLatestProducts(limit = 6) {
    return [...state.products]
      .sort((a, b) => {
        const aKey = productDateKey(a);
        const bKey = productDateKey(b);

        if (aKey && bKey) {
          return bKey.localeCompare(aKey);
        }

        return (
          state.products.indexOf(b) -
          state.products.indexOf(a)
        );
      })
      .slice(0, limit);
  }

  function renderHeroCarousel() {
    const container = $('#heroCarousel');
    const dots = $('#heroDots');

    if (!container) return;

    heroProducts = getLatestProducts(6);

    if (!heroProducts.length) {
      container.innerHTML = '';

      if (dots) {
        dots.innerHTML = '';
      }

      return;
    }

    const total = heroProducts.length;

    const positions = [
      {
        offset: 0,
        className: 'hero-product-main'
      },
      {
        offset: 1,
        className: 'hero-product-left'
      },
      {
        offset: 2,
        className: 'hero-product-right'
      }
    ];

    container.innerHTML = positions
      .filter(
        (_, index) =>
          index < Math.min(3, total)
      )
      .map(position => {
        const index =
          (heroIndex + position.offset) %
          total;

        const product =
          heroProducts[index];

        return `
          <button
            class="hero-product-card ${position.className}"
            data-product-id="${escAttr(product.id)}"
            aria-label="Abrir ${escAttr(product.name)}"
          >

            <img
              src="${escAttr(safeImage(product.image))}"
              alt="${escAttr(product.name)}"
              draggable="false"
              onerror="this.src='${escAttr(safeImage(''))}'"
            >

            <span class="hero-new-badge">
              NOVA
            </span>

            <div class="hero-product-info">

              <strong>
                ${escapeHtml(product.name)}
              </strong>

              <span>
                ${escapeHtml(product.team || '')}

                ${
                  product.season
                    ? ` • ${escapeHtml(product.season)}`
                    : ''
                }
              </span>

            </div>

          </button>
        `;
      })
      .join('');

    if (dots) {
      dots.innerHTML = heroProducts
        .map(
          (_, index) => `
            <button
              class="${
                index === heroIndex
                  ? 'active'
                  : ''
              }"
              data-hero-dot="${index}"
              aria-label="Mostrar produto ${index + 1}"
            ></button>
          `
        )
        .join('');
    }
  }

  function moveHero(direction) {
    if (!heroProducts.length) return;

    heroIndex =
      (
        heroIndex +
        direction +
        heroProducts.length
      ) % heroProducts.length;

    renderHeroCarousel();
    restartHeroTimer();
  }

  function restartHeroTimer() {
    clearInterval(heroTimer);

    if (heroProducts.length <= 1) {
      return;
    }

    heroTimer = setInterval(() => {
      heroIndex =
        (heroIndex + 1) %
        heroProducts.length;

      renderHeroCarousel();
    }, 4000);
  }

  function startHeroCarousel() {
    heroProducts =
      getLatestProducts(6);

    heroIndex = 0;

    renderHeroCarousel();
    restartHeroTimer();
  }

  /* =====================================================
     ELEMENTOS
     ===================================================== */

  const els = {
    grid: $('#productsGrid'),
    empty: $('#emptyState'),
    result: $('#resultCount'),
    cats: $('#categoryFilters'),
    active: $('#activeFilters'),
    searchInput: $('#searchInput'),
    searchPanel: $('#searchPanel'),
    drawer: $('#filterDrawer'),
    modal: $('#productModal'),
    model: $('#modelFilter'),
    size: $('#sizeFilter'),
    season: $('#seasonFilter'),
    toast: $('#toast')
  };

  /* =====================================================
     UTILITÁRIOS
     ===================================================== */

  const norm = s =>
    String(s ?? '')
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toLowerCase()
      .trim();

  const money = v =>
    new Intl.NumberFormat(
      'pt-BR',
      {
        style: 'currency',
        currency:
          state.data?.config?.moeda ||
          'BRL'
      }
    ).format(Number(v || 0));

  const minPrice = p => {
    const values =
      (p.variants || [])
        .map(
          v =>
            Number(v.price) || 0
        )
        .filter(v => v > 0);

    return values.length
      ? Math.min(...values)
      : 0;
  };

  const visibleVariants = p =>
    (p.variants || []).filter(
      v =>
        p.availability ===
        'Sob encomenda'
          ? true
          : v.available !== false
    );

  const safeImage = url =>
    url ||
    'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(`
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 600 700"
        >
          <rect
            width="100%"
            height="100%"
            fill="#171717"
          />

          <text
            x="50%"
            y="50%"
            fill="#555"
            font-family="Arial"
            font-size="30"
            text-anchor="middle"
          >
            SEM IMAGEM
          </text>
        </svg>
      `);

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(
        /[&<>'"]/g,
        c =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
          }[c])
      );
  }

  function escAttr(s) {
    return escapeHtml(s);
  }

  /* =====================================================
     SKELETON
     ===================================================== */

  function showProductSkeletons() {
    if (!els.grid) return;

    if (els.empty) {
      els.empty.classList.add(
        'hidden'
      );
    }

    if (els.result) {
      els.result.textContent = '—';
    }

    els.grid.innerHTML =
      Array.from({
        length: 8
      })
        .map(
          () => `
            <article
              class="product-card skeleton-card"
              aria-hidden="true"
            >

              <div
                class="product-image skeleton-block"
              ></div>

              <div class="product-body">

                <div
                  class="skeleton-line skeleton-small"
                ></div>

                <div
                  class="skeleton-line skeleton-title"
                ></div>

                <div
                  class="skeleton-line skeleton-medium"
                ></div>

                <div class="product-foot">

                  <div
                    class="skeleton-line skeleton-price"
                  ></div>

                </div>

              </div>

            </article>
          `
        )
        .join('');
  }

  /* =====================================================
     API
     ===================================================== */

  async function loadData() {
    const cfg =
      window.CATALOG_CONFIG || {};

    if (cfg.apiUrl) {
      try {
        const res =
          await fetch(
            cfg.apiUrl,
            {
              cache: 'default'
            }
          );

        if (!res.ok) {
          throw new Error(
            `API respondeu HTTP ${res.status}`
          );
        }

        const json =
          await res.json();

        if (!json.ok) {
          throw new Error(
            json.error ||
            'Falha na API'
          );
        }

        return json;

      } catch (err) {

        console.warn(
          'API indisponível.',
          err
        );

        if (
          cfg.fallbackToDemo &&
          window.CATALOG_DEMO
        ) {
          showToast(
            'API não conectada — exibindo prévia local.'
          );

          return window.CATALOG_DEMO;
        }

        throw err;
      }
    }

    return window.CATALOG_DEMO;
  }

  /* =====================================================
     CONFIGURAÇÃO
     ===================================================== */

  function applyConfig() {
    const c =
      state.data?.config || {};

    const name =
      c.nome_loja ||
      'Sua Loja';

    const brandName =
      $('#brandName');

    const footerBrand =
      $('#footerBrand');

    if (brandName) {
      brandName.textContent =
        name.toUpperCase();
    }

    if (footerBrand) {
      footerBrand.textContent =
        name.toUpperCase();
    }

    const heroTitle =
      $('#heroTitle');

    if (heroTitle) {
      heroTitle.innerHTML =
        escapeHtml(
          c.titulo_hero ||
          'Camisas que fazem história.'
        ).replace(
          /história\.?$/i,
          '<em>história.</em>'
        );
    }

    const heroSubtitle =
      $('#heroSubtitle');

    if (heroSubtitle) {
      heroSubtitle.textContent =
        c.subtitulo_hero || '';
    }

    const ig =
      String(
        c.instagram || ''
      ).trim();

    const instagramLink =
      $('#instagramLink');

    if (instagramLink) {
      instagramLink.href =
        ig
          ? `https://instagram.com/${ig.replace(/^@/, '')}`
          : '#';
    }

    const heroCount =
      $('#heroCount');

    if (heroCount) {
      heroCount.textContent =
        state.products.length;
    }

    const year =
      $('#year');

    if (year) {
      year.textContent =
        `© ${new Date().getFullYear()}`;
    }

    document.title =
      `${name} • Catálogo`;
  }

  /* =====================================================
     FILTROS
     ===================================================== */

  function fillSelect(
    el,
    values
  ) {
    if (!el) return;

    values.forEach(v => {
      const o =
        document.createElement(
          'option'
        );

      o.value = v;
      o.textContent = v;

      el.appendChild(o);
    });
  }

  function populateFilters() {
    const categories = [
      'Todos',
      ...new Set(
        state.products
          .map(
            p => p.category
          )
          .filter(Boolean)
      )
    ];

    if (els.cats) {
      els.cats.innerHTML =
        categories
          .map(
            c => `
              <button
                class="chip ${
                  c === 'Todos'
                    ? 'active'
                    : ''
                }"
                data-category="${escAttr(c)}"
              >
                ${escapeHtml(c)}
              </button>
            `
          )
          .join('');
    }

    if (els.model) {
      els.model.innerHTML =
        '<option value="">Todos</option>';

      fillSelect(
        els.model,
        [
          ...new Set(
            state.products
              .map(
                p => p.model
              )
              .filter(Boolean)
          )
        ].sort()
      );
    }

    if (els.size) {
      els.size.innerHTML =
        '<option value="">Todos</option>';

      fillSelect(
        els.size,
        [
          ...new Set(
            state.products
              .flatMap(
                p =>
                  (
                    p.variants ||
                    []
                  ).map(
                    v =>
                      v.size
                  )
              )
              .filter(Boolean)
          )
        ]
      );
    }

    if (els.season) {
      els.season.innerHTML =
        '<option value="">Todas</option>';

      fillSelect(
        els.season,
        [
          ...new Set(
            state.products
              .map(
                p =>
                  p.season
              )
              .filter(Boolean)
          )
        ]
          .sort()
          .reverse()
      );
    }

    updateCounts();
  }

  function filtered() {
    const q =
      norm(state.search);

    return state.products
      .filter(
        p =>
          state.category ===
            'Todos' ||
          p.category ===
            state.category
      )
      .filter(
        p =>
          !state.model ||
          p.model ===
            state.model
      )
      .filter(
        p =>
          !state.season ||
          p.season ===
            state.season
      )
      .filter(
        p =>
          !state.size ||
          visibleVariants(p)
            .some(
              v =>
                v.size ===
                state.size
            )
      )
      .filter(
        p =>
          !q ||
          norm(
            [
              p.name,
              p.team,
              p.category,
              p.model,
              p.season,
              p.subcategory
            ].join(' ')
          ).includes(q)
      )
      .sort(
        (a, b) =>
          Number(
            b.featured
          ) -
          Number(
            a.featured
          )
      );
  }

  /* =====================================================
     RENDER PRODUTOS
     ===================================================== */

  function render() {
    const list =
      filtered();

    if (els.result) {
      els.result.textContent =
        list.length;
    }

    if (els.grid) {
      els.grid.innerHTML =
        list
          .map(card)
          .join('');
    }

    if (els.empty) {
      els.empty.classList.toggle(
        'hidden',
        list.length > 0
      );
    }

    renderActiveFilters();
  }

  function card(p) {
    const vars =
      visibleVariants(p);

    const price =
      minPrice({
        ...p,
        variants: vars
      });

    return `
      <article
        class="product-card"
        data-product-id="${escAttr(p.id)}"
        tabindex="0"
      >

        <div class="product-image">

          <img
            src="${escAttr(safeImage(p.image))}"
            alt="${escAttr(p.name)}"
            loading="lazy"
            decoding="async"
            onerror="this.src='${escAttr(safeImage(''))}'"
          >


          ${
            p.featured
              ? `
                <span
                  class="featured-badge"
                  title="Destaque"
                >
                  ★
                </span>
              `
              : ''
          }

        </div>

        <div class="product-body">

          <div class="product-meta">

            <span>
              ${escapeHtml(
                p.team ||
                p.category ||
                ''
              )}
            </span>

            <span>
              ${escapeHtml(
                p.season ||
                ''
              )}
            </span>

          </div>

          <h3>
            ${escapeHtml(p.name)}
          </h3>

          <div class="sizes">

            ${
              vars
                .slice(0, 5)
                .map(
                  v => `
                    <span class="size-pill">
                      ${escapeHtml(v.size)}
                    </span>
                  `
                )
                .join('')
            }

            ${
              vars.length > 5
                ? `
                  <span class="size-pill">
                    +${vars.length - 5}
                  </span>
                `
                : ''
            }

          </div>

          <div class="product-foot">

            <div class="price">

              <small>
                a partir de
              </small>

              <strong>
                ${
                  price
                    ? money(price)
                    : 'Consulte'
                }
              </strong>

            </div>

            <span class="card-arrow">
              ↗
            </span>

          </div>

        </div>

      </article>
    `;
  }

  function renderActiveFilters() {
    const tags = [];

    if (state.search) {
      tags.push(
        `Busca: ${state.search}`
      );
    }

    if (state.model) {
      tags.push(
        state.model
      );
    }

    if (state.size) {
      tags.push(
        `Tam. ${state.size}`
      );
    }

    if (state.season) {
      tags.push(
        state.season
      );
    }

    if (els.active) {
      els.active.innerHTML =
        tags
          .map(
            t => `
              <span class="filter-tag">
                ${escapeHtml(t)}
              </span>
            `
          )
          .join('');
    }
  }

  function updateCounts() {
    const ready =
      state.products.filter(
        p =>
          p.availability ===
          'Pronta entrega'
      ).length;

    const order =
      state.products.filter(
        p =>
          p.availability ===
          'Sob encomenda'
      ).length;

    const readyCount =
      $('#readyCount');

    const orderCount =
      $('#orderCount');

    if (readyCount) {
      readyCount.textContent =
        `${ready} ${
          ready === 1
            ? 'produto disponível'
            : 'produtos disponíveis'
        }`;
    }

    if (orderCount) {
      orderCount.textContent =
        `${order} ${
          order === 1
            ? 'produto disponível'
            : 'produtos disponíveis'
        }`;
    }
  }

  /* =====================================================
     DISPONIBILIDADE
     ===================================================== */

  function setAvailability(
    value,
    scroll = true
  ) {
    state.availability =
      value;

    $$('.mode-card')
      .forEach(
        b =>
          b.classList.toggle(
            'active',
            b.dataset.mode ===
              value
          )
      );

    render();

    if (scroll) {
      $('#catalog')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    }
  }

  /* =====================================================
     PRODUTO / MODAL
     ===================================================== */

  function openProduct(id) {
    const p =
      state.products.find(
        x =>
          x.id === id
      );

    if (!p) return;

    state.selectedProduct =
      p;

    state.selectedSize = '';

    const vars =
      visibleVariants(p);

    const price =
      minPrice({
        ...p,
        variants: vars
      });

    const modalImage =
      $('#modalImage');

    if (modalImage) {
      modalImage.src =
        safeImage(p.image);

      modalImage.alt =
        p.name;
    }

    $('#modalProductName').textContent =
      p.name;

    $('#modalCategory').textContent =
      p.category || '';

    $('#modalSeason').textContent =
      p.season || '';

    $('#modalDescription').textContent =
      p.description ||
      `${p.model || 'Camisa'} • ${p.team || ''}`;

    $('#modalPrice').textContent =
      price
        ? money(price)
        : 'Consulte';

    const badge =
      $('#modalAvailability');

    badge.textContent =
      '';

    badge.hidden = true;

    $('#modalLeadTime').textContent = '';

    $('#modalSizes').innerHTML =
      vars.length
        ? vars
            .map(
              v => `
                <button
                  class="size-btn"
                  data-size="${escAttr(v.size)}"
                >
                  ${escapeHtml(v.size)}
                </button>
              `
            )
            .join('')
        : `
          <span class="filter-tag">
            Tamanho a consultar
          </span>
        `;

    updateWhatsapp();

    toggleModal(true);
  }

  /* =====================================================
     WHATSAPP
     ===================================================== */

  function updateWhatsapp() {
    const btn =
      $('#whatsappButton');

    const p =
      state.selectedProduct;

    const c =
      state.data?.config ||
      {};

    if (!btn) return;

    const vars =
      visibleVariants(
        p || {}
      );

    const requiresSize =
      vars.length > 0;

    btn.classList.toggle(
      'disabled',
      requiresSize &&
      !state.selectedSize
    );

    if (!p) return;

    const selected =
      vars.find(
        v =>
          v.size ===
          state.selectedSize
      );

    const price =
      selected?.price ||
      minPrice({
        ...p,
        variants: vars
      });

    const msg = [
      c.texto_whatsapp ||
        'Olá! Tenho interesse:',

      `*${p.name}*`,

      p.model
        ? `Modelo: ${p.model}`
        : '',

      state.selectedSize
        ? `Tamanho: ${state.selectedSize}`
        : '',


      price
        ? `Valor: ${money(price)}`
        : ''
    ]
      .filter(Boolean)
      .join('\n');

    const number =
      String(
        c.whatsapp || ''
      ).replace(
        /\D/g,
        ''
      );

    btn.href =
      number
        ? `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
        : '#';
  }

  /* =====================================================
     MODAL / DRAWER / TOAST
     ===================================================== */

  function toggleDrawer(open) {
    if (!els.drawer) return;

    els.drawer.classList.toggle(
      'open',
      open
    );

    els.drawer.setAttribute(
      'aria-hidden',
      String(!open)
    );

    document.body.style.overflow =
      open
        ? 'hidden'
        : '';
  }

  function toggleModal(open) {
    if (!els.modal) return;

    els.modal.classList.toggle(
      'open',
      open
    );

    els.modal.setAttribute(
      'aria-hidden',
      String(!open)
    );

    document.body.style.overflow =
      open
        ? 'hidden'
        : '';
  }

  function resetFilters() {
    state.search = '';
    state.category = 'Todos';
    state.model = '';
    state.size = '';
    state.season = '';

    if (els.searchInput) {
      els.searchInput.value = '';
    }

    if (els.model) {
      els.model.value = '';
    }

    if (els.size) {
      els.size.value = '';
    }

    if (els.season) {
      els.season.value = '';
    }

    $$('.chip')
      .forEach(
        b =>
          b.classList.toggle(
            'active',
            b.dataset.category ===
              'Todos'
          )
      );

    render();
  }

  function showToast(msg) {
    if (!els.toast) return;

    els.toast.textContent =
      msg;

    els.toast.classList.add(
      'show'
    );

    clearTimeout(
      showToast.t
    );

    showToast.t =
      setTimeout(
        () =>
          els.toast.classList.remove(
            'show'
          ),
        2600
      );
  }

  /* =====================================================
     EVENTOS
     ===================================================== */

  function bind() {
    document.addEventListener(
      'click',
      e => {

        const heroCard =
          e.target.closest(
            '.hero-product-card'
          );

        if (heroCard) {
          openProduct(
            heroCard.dataset.productId
          );
        }

        const heroNav =
          e.target.closest(
            '[data-hero-nav]'
          );

        if (heroNav) {
          moveHero(
            heroNav.dataset.heroNav ===
            'next'
              ? 1
              : -1
          );
        }

        const heroDot =
          e.target.closest(
            '[data-hero-dot]'
          );

        if (heroDot) {
          heroIndex =
            Number(
              heroDot.dataset.heroDot
            );

          renderHeroCarousel();

          restartHeroTimer();
        }

        const card =
          e.target.closest(
            '.product-card:not(.skeleton-card)'
          );

        if (card) {
          openProduct(
            card.dataset.productId
          );
        }

        const mode =
          e.target.closest(
            '[data-mode]'
          );

        if (mode) {
          setAvailability(
            mode.dataset.mode
          );
        }

        const avail =
          e.target.closest(
            '[data-availability]'
          );

        if (avail) {
          setAvailability(
            avail.dataset.availability
          );
        }

        const cat =
          e.target.closest(
            '[data-category]'
          );

        if (cat) {
          state.category =
            cat.dataset.category;

          $$('.chip')
            .forEach(
              b =>
                b.classList.toggle(
                  'active',
                  b === cat
                )
            );

          render();
        }

        if (
          e.target.closest(
            '[data-close-drawer]'
          )
        ) {
          toggleDrawer(false);
        }

        if (
          e.target.closest(
            '[data-close-modal]'
          )
        ) {
          toggleModal(false);
        }

        const size =
          e.target.closest(
            '.size-btn'
          );

        if (size) {
          state.selectedSize =
            size.dataset.size;

          $$('.size-btn')
            .forEach(
              b =>
                b.classList.toggle(
                  'active',
                  b === size
                )
            );

          updateWhatsapp();
        }

        if (
          e.target.closest(
            '[data-scroll-products]'
          )
        ) {
          $('#catalog')
            ?.scrollIntoView({
              behavior: 'smooth'
            });
        }
      }
    );

    els.searchInput
      ?.addEventListener(
        'input',
        e => {
          state.search =
            e.target.value;

          render();
        }
      );

    const clearSearch =
      $('#clearSearch');

    if (clearSearch) {
      clearSearch.onclick =
        () => {
          state.search = '';

          els.searchInput.value =
            '';

          render();

          els.searchInput.focus();
        };
    }

    const searchToggle =
      $('#searchToggle');

    if (searchToggle) {
      searchToggle.onclick =
        () => {
          $('#catalog')
            ?.scrollIntoView({
              behavior: 'smooth'
            });

          setTimeout(
            () =>
              els.searchInput
                ?.focus(),
            450
          );
        };
    }

    const filterButton =
      $('#filterButton');

    if (filterButton) {
      filterButton.onclick =
        () =>
          toggleDrawer(true);
    }

    const resetFilters =
      $('#resetFilters');

    if (resetFilters) {
      resetFilters.onclick =
        () =>
          window.location.reload();
    }

    const clearDrawer =
      $('#clearDrawer');

    if (clearDrawer) {
      clearDrawer.onclick =
        () => {
          state.model = '';
          state.size = '';
          state.season = '';

          els.model.value = '';
          els.size.value = '';
          els.season.value = '';

          render();
        };
    }

    if (els.model) {
      els.model.onchange =
        e => {
          state.model =
            e.target.value;

          render();
        };
    }

    if (els.size) {
      els.size.onchange =
        e => {
          state.size =
            e.target.value;

          render();
        };
    }

    if (els.season) {
      els.season.onchange =
        e => {
          state.season =
            e.target.value;

          render();
        };
    }

    document.addEventListener(
      'keydown',
      e => {
        if (e.key === 'Escape') {
          toggleDrawer(false);
          toggleModal(false);
        }

        const c =
          e.target.closest?.(
            '.product-card:not(.skeleton-card)'
          );

        if (
          c &&
          (
            e.key === 'Enter' ||
            e.key === ' '
          )
        ) {
          e.preventDefault();

          openProduct(
            c.dataset.productId
          );
        }
      }
    );
  }

  /* =====================================================
     REVEAL
     ===================================================== */

  function observe() {
    const elements =
      $$('.reveal');

    if (
      !(
        'IntersectionObserver'
        in window
      )
    ) {
      elements.forEach(
        el =>
          el.classList.add(
            'visible'
          )
      );

      return;
    }

    const io =
      new IntersectionObserver(
        entries => {
          entries.forEach(
            entry => {
              if (
                entry.isIntersecting
              ) {
                entry.target
                  .classList.add(
                    'visible'
                  );

                io.unobserve(
                  entry.target
                );
              }
            }
          );
        },
        {
          threshold: 0.01,
          rootMargin:
            '100px 0px'
        }
      );

    elements.forEach(
      el => {
        io.observe(el);

        setTimeout(
          () => {
            el.classList.add(
              'visible'
            );
          },
          800
        );
      }
    );
  }

  /* =====================================================
     LOADING SCREEN
     ===================================================== */

  const loaderStartTime =
    Date.now();

  let loaderHidden = false;
  let loaderHideScheduled = false;

  function hideCatalogLoader() {
    if (
      loaderHidden ||
      loaderHideScheduled
    ) {
      return;
    }

    const loader =
      $('#catalogLoader');

    if (!loader) {
      loaderHidden = true;

      document.body
        .classList.remove(
          'catalog-loading'
        );

      return;
    }

    /*
     * Mantém o loading visível por
     * pelo menos 850ms.
     */
    const minimumLoadingTime =
      850;

    const elapsed =
      Date.now() -
      loaderStartTime;

    const delay =
      Math.max(
        0,
        minimumLoadingTime -
        elapsed
      );

    loaderHideScheduled =
      true;

    setTimeout(
      () => {

        if (loaderHidden) {
          return;
        }

        loaderHidden = true;

        loader.classList.add(
          'is-hidden'
        );

        document.body
          .classList.remove(
            'catalog-loading'
          );

        loader.setAttribute(
          'aria-busy',
          'false'
        );

        setTimeout(
          () => {
            loader.remove();
          },
          700
        );

      },
      delay
    );
  }

  /* =====================================================
     INICIALIZAÇÃO
     ===================================================== */

  async function init() {
    /*
     * A estrutura visual começa
     * imediatamente.
     */
    observe();
    bind();

    /*
     * Enquanto a API responde,
     * mostramos os skeletons.
     */
    showProductSkeletons();

    /*
     * O usuário nunca fica preso
     * na tela cheia esperando o
     * Apps Script.
     */
    setTimeout(
      () => {
        hideCatalogLoader();
      },
      900
    );

    try {
      state.data =
        await loadData();

      state.products =
        (
          state.data?.products ||
          []
        ).map(
          p => ({
            ...p,

            featured:
              p.featured === true ||
              p.featured === 'Sim'
          })
        );

      applyConfig();

      populateFilters();

      render();

      startHeroCarousel();

      /*
       * Caso a API seja muito rápida,
       * ainda respeitamos o tempo
       * mínimo do loading.
       */
      hideCatalogLoader();

    } catch (err) {
      console.error(err);

      /*
       * Remove os skeletons em caso
       * de erro.
       */
      if (els.grid) {
        els.grid.innerHTML = '';
      }

      if (els.result) {
        els.result.textContent = '0';
      }

      if (els.empty) {
        els.empty.classList.remove(
          'hidden'
        );
      }

      showToast(
        'Não foi possível carregar o catálogo.'
      );

      hideCatalogLoader();
    }
  }

  init();

})();