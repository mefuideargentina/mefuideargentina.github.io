const SUPABASE_URL = "https://xagsdvhibdgfmotiomoq.supabase.co";
const SUPABASE_KEY = "sb_publishable_dipmh2_QaDQ-fZ69o_C3hQ_KaarUTlv";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentFilter = "todos";
let currentCity = "todas";

const labels = {
  vivienda:"VIVIENDA",
  trabajo:"TRABAJO",
  eventos:"EVENTOS",
  compraventa:"COMPRA / VENTA"
};

function safe(s=""){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function icon(name, className = "ui-icon") {
  const safeName = String(name || "chat").replace(/[^a-z-]/g, "");
  const safeClass = String(className).replace(/[^a-z0-9-_ ]/gi, "");
  return `<svg class="${safeClass}" aria-hidden="true" focusable="false"><use href="#icon-${safeName}"></use></svg>`;
}

function parseListingImages(value) {
  if (!value) return [];
  try {
    const images = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(images) ? images.filter(image => typeof image === "string") : [];
  } catch (error) {
    console.warn("Una publicación tiene imágenes con formato no válido.", error);
    return [];
  }
}

function formatListingAge(createdAt) {
  if (!createdAt) return "Publicado recientemente";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Publicado recientemente";
  const elapsedHours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000));
  if (elapsedHours < 1) return "Hace menos de 1 h";
  if (elapsedHours < 24) return `Hace ${elapsedHours} h`;
  const days = Math.floor(elapsedHours / 24);
  return days === 1 ? "Hace 1 día" : `Hace ${days} días`;
}

const categoryIcons = {
  vivienda: "home",
  trabajo: "work",
  eventos: "calendar",
  compraventa: "shop"
};

const categoryPlaceholderLabels = {
  vivienda: "ALOJAMIENTO SIN FOTO",
  trabajo: "OPORTUNIDAD LABORAL",
  eventos: "EVENTO O PLAN",
  compraventa: "PRODUCTO SIN FOTO"
};

let supabaseListings = [];

async function loadApprovedListings(){
    const { data, error } = await supabaseClient
        .from("anuncios")
        .select("*")
        .eq("estado", "aprobado")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error cargando anuncios:", error);
        document.getElementById("listingGrid").innerHTML =
          `<div class="empty-state"><span>↻</span><h3>No pudimos cargar los anuncios</h3><p>Puede ser algo momentáneo. Probá otra vez.</p><div class="empty-actions"><button class="empty-primary" onclick="loadApprovedListings()">Reintentar</button></div></div>`;
        return;
    }

   supabaseListings = data.map(x => ({
    id: String(x.id),
    category: x.categoria,
    title: x.titulo,
    city: x.ciudad,
    location: x.ciudad,
    price: x.precio,
    description: x.descripcion,
    contact: x.contacto,
    images: parseListingImages(x.imagen_url),
    age: formatListingAge(x.created_at),
    createdAt: x.created_at,
    featured: x.destacado === true && x.destacado_hasta && new Date(x.destacado_hasta) > new Date(),
    featuredUntil: x.destacado_hasta
}));

supabaseListings.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
});

    render();
}

function getAll(){
return supabaseListings;
}

function renderPrice(value){
  if(!value) return "Consultar";
  const price = String(value).trim();
  return /^\d+(?:[.,]\d+)?$/.test(price) ? `${safe(price)} €` : safe(price);
}

function render(){
  const grid = document.getElementById("listingGrid");
  const resultsCount = document.getElementById("resultsCount");
  const data = getAll().filter(x=>{
    const cat = currentFilter==="todos" || x.category===currentFilter;
    const city =
  currentCity === "todas" ||
  (x.city || "").trim().toLowerCase() === currentCity.trim().toLowerCase();
    return cat && city;
  });

  if (resultsCount) {
    resultsCount.textContent = data.length === 1 ? "1 resultado" : `${data.length} resultados`;
  }

  if(!data.length){
    const place = currentCity !== "todas" ? ` en ${safe(currentCity)}` : "";
    grid.innerHTML = `
      <div class="empty-state">
        <span>${icon("search")}</span>
        <h3>Todavía no hay publicaciones${place}</h3>
        <p>Probá viendo todas las categorías o publicá gratis para que otra persona pueda encontrarte.</p>
        <div class="empty-actions">
          <button onclick="resetListingFilters()">Ver todas</button>
          <button class="empty-primary" onclick="goToPublish()">Publicar primero</button>
        </div>
      </div>`;
    return;
  }

  grid.innerHTML = data.map(x=>`
   <article class="listing-card category-${safe(x.category)} ${x.featured ? "featured-card" : ""} ${x.images && x.images.length ? "has-images" : "no-images"}">
      <div class="meta">
  <div>
    ${x.featured ? `<span class="featured-badge">DESTACADO</span>` : ""}
    <span class="badge">${labels[x.category] || "PUBLICACIÓN"}</span>
  </div>

  <span class="age">${safe(x.age)}</span>
</div>
    ${x.images && x.images.length ? `
  <div class="listing-images">
    ${x.images.slice(0, 3).map((img, imageIndex) => `
      <img
  src="${safe(img)}"
  alt="${safe(x.title)}"
  loading="lazy"
  onclick="openListingDetail('${safe(x.id)}', ${imageIndex})"
>
    `).join("")}
  </div>
` : `<button class="listing-placeholder listing-placeholder-${safe(x.category)}" onclick="openListingDetail('${safe(x.id)}')" aria-label="Ver ${safe(x.title)}"><span>${icon(categoryIcons[x.category] || "doc")}</span><small>${categoryPlaceholderLabels[x.category] || "PUBLICACIÓN"}</small></button>`}
      <h3>${safe(x.title)}</h3>
      <p>${safe(x.description)}</p>
      <div class="bottom">
        <span>${icon("pin")} ${safe(x.location)}</span>
        <strong>${renderPrice(x.price)}</strong>
      </div>
      <div class="contacto">
  ${renderContact(x.contact)}
</div>
<div class="listing-actions">
  <button class="listing-detail-button" onclick="openListingDetail('${safe(x.id)}')">Ver publicación <span>→</span></button>
  <button class="listing-share-button" onclick="shareListing('${safe(x.id)}')" aria-label="Compartir ${safe(x.title)}">Compartir</button>
  <button class="report-button" onclick="reportListingById('${safe(x.id)}')">Reportar</button>
</div>
    </article>
  `).join("");

  openListingFromUrl();
}

function resetListingFilters(){
  currentFilter = "todos";
  currentCity = "todas";
  const citySelect = document.getElementById("citySelect");
  if(citySelect) citySelect.value = "todas";
  document.querySelectorAll(".filter").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === "todos");
  });
  render();
}

document.querySelectorAll("[data-filter]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    currentFilter = btn.dataset.filter;
    document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.dataset.filter===currentFilter));
    render();
    if(btn.classList.contains("category")){
      document.querySelector(".recent").scrollIntoView({behavior:"smooth"});
    }
  });
});

document.getElementById("citySelect").addEventListener("change",e=>{
  currentCity=e.target.value;
  render();
});

const publishForm = document.getElementById("publishForm");
const imageInput = document.getElementById("images");
const imagePreview = document.getElementById("imagePreview");
const publishSubmit = document.getElementById("publishSubmit");
const formStatus = document.getElementById("formStatus");
let selectedPublishImages = [];
let previewObjectUrls = [];

function clearPreviewObjectUrls() {
  previewObjectUrls.forEach(url => URL.revokeObjectURL(url));
  previewObjectUrls = [];
}

function renderImagePreview() {
  if (!imagePreview) return;
  clearPreviewObjectUrls();
  if (!selectedPublishImages.length) {
    imagePreview.innerHTML = "";
    return;
  }
  imagePreview.innerHTML = selectedPublishImages.map((file, index) => {
    const url = URL.createObjectURL(file);
    previewObjectUrls.push(url);
    return `<figure><img src="${url}" alt="Vista previa ${index + 1}"><button type="button" data-remove-image="${index}" aria-label="Quitar imagen ${index + 1}">×</button><figcaption>${index === 0 ? "Portada" : `Foto ${index + 1}`}</figcaption></figure>`;
  }).join("");
  imagePreview.querySelectorAll("[data-remove-image]").forEach(button => {
    button.addEventListener("click", () => {
      selectedPublishImages.splice(Number(button.dataset.removeImage), 1);
      renderImagePreview();
    });
  });
}

imageInput?.addEventListener("change", event => {
  const files = Array.from(event.target.files || []);
  const validTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (files.length > 3) {
    formStatus.textContent = "Podés seleccionar como máximo 3 fotos.";
  }
  const validFiles = files.filter(file => {
    if (!validTypes.has(file.type)) return false;
    return file.size <= 8 * 1024 * 1024;
  }).slice(0, 3);
  if (validFiles.length !== Math.min(files.length, 3)) {
    formStatus.textContent = "Alguna imagen no era compatible o superaba los 8 MB.";
  } else if (files.length <= 3) {
    formStatus.textContent = "";
  }
  selectedPublishImages = validFiles;
  renderImagePreview();
  event.target.value = "";
});

async function optimizeImage(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d", { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .82));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

publishForm?.addEventListener("submit", async e => {
  e.preventDefault();

  const ciudad = document.getElementById("location").value.trim();
  const imageUrls = [];
  publishSubmit.disabled = true;
  publishSubmit.textContent = "Preparando publicación…";
  formStatus.textContent = selectedPublishImages.length ? "Optimizando imágenes…" : "Enviando publicación…";

for (let index = 0; index < selectedPublishImages.length; index += 1) {
  let file;
  try {
    file = await optimizeImage(selectedPublishImages[index]);
  } catch (error) {
    console.error(error);
    formStatus.textContent = "No pudimos procesar una de las imágenes. Probá con otra foto.";
    publishSubmit.disabled = false;
    publishSubmit.textContent = "Enviar para revisión";
    return;
  }
  formStatus.textContent = `Subiendo imagen ${index + 1} de ${selectedPublishImages.length}…`;
  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const fileName = `${Date.now()}-${uniqueId}.${file.type === "image/webp" ? "webp" : file.name.split(".").pop()}`;

  const { error: uploadError } = await supabaseClient.storage
    .from("anuncios")
    .upload(fileName, file);

  if (uploadError) {
    console.error(uploadError);
    formStatus.textContent = "No se pudieron subir las fotos. Probá nuevamente.";
    publishSubmit.disabled = false;
    publishSubmit.textContent = "Enviar para revisión";
    return;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from("anuncios")
    .getPublicUrl(fileName);

  imageUrls.push(publicUrlData.publicUrl);
}

const anuncio = {
  categoria: document.getElementById("category").value,
  titulo: document.getElementById("title").value.trim(),
  descripcion: document.getElementById("description").value.trim(),
  ciudad: ciudad,
  precio: document.getElementById("price").value.trim(),
  contacto: document.getElementById("contact").value.trim(),
  imagen_url: imageUrls.length ? JSON.stringify(imageUrls) : null,
  estado: "pendiente"
};

  formStatus.textContent = "Guardando publicación…";

  const { error } = await supabaseClient
    .from("anuncios")
    .insert([anuncio]);

  if (error) {
    console.error(error);
    formStatus.textContent = "No se pudo enviar. Probá nuevamente.";
    publishSubmit.disabled = false;
    publishSubmit.textContent = "Enviar para revisión";
    return;
  }

  e.target.reset();
  selectedPublishImages = [];
  renderImagePreview();
  publishSubmit.disabled = false;
  publishSubmit.textContent = "Enviar para revisión";
  formStatus.innerHTML = "<strong>Publicación recibida.</strong><br>Quedó pendiente de revisión antes de aparecer en la web.";
});


render();


let communityGroups = [];
let communityGroupsLoaded = false;

async function loadCommunityGroups() {
  const { data, error } = await supabaseClient
    .from("grupos")
    .select("*")
    .eq("estado", "aprobado")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error cargando grupos:", error);
    document.getElementById("groupDirectory").innerHTML =
      `<div class="empty-state"><span>↻</span><h3>No pudimos cargar los grupos</h3><p>Probá nuevamente en unos minutos.</p><div class="empty-actions"><button class="empty-primary" onclick="loadCommunityGroups()">Reintentar</button></div></div>`;
    return;
  }

  communityGroups = data.map(g => ({
    name: g.nombre,
    category: g.categoria,
    icon: getGroupIcon(g.categoria, g.nombre),
    description: g.descripcion,
    url: g.enlace,
    city: g.ciudad
  }));

  communityGroupsLoaded = true;

  renderGroups();
}

function getGroupIcon(category, name) {
  const groupName = (name || "").toLowerCase();

  // Vóley
  if (
    groupName.includes("volley") ||
    groupName.includes("voley") ||
    groupName.includes("vóley")
  ) {
    return "ball";
  }

  // Fútbol
  if (
    groupName.includes("futbol") ||
    groupName.includes("fútbol") ||
    groupName.includes("fulbito") ||
    groupName.includes("football")
  ) {
    return "ball";
  }

  const icons = {
    trabajo: "work",
    vivienda: "home",
    general: "people",
    servicios: "megaphone",
    compraventa: "shop",
    social: "chat",
    deportes: "ball"
  };

  return icons[category] || "chat";
}
let groupFilter = "todos";

function renderGroups(){
  const directory = document.getElementById("groupDirectory");
  if(!directory) return;
  if(!communityGroupsLoaded){
    directory.innerHTML = `<div class="empty">Cargando grupos de la comunidad…</div>`;
    return;
  }
  const city = document.getElementById("groupCity").value;

  if(city === "proximamente"){
    directory.innerHTML = `<div class="empty">Estamos empezando por Valencia 🇦🇷🇪🇸<br><br>Madrid, Barcelona, Málaga, Alicante y otras ciudades se irán sumando.</div>`;
    return;
  }

const groups = communityGroups.filter(g =>
  g.city === city &&
  (groupFilter === "todos" || g.category === groupFilter)
);
  if(!groups.length){
    directory.innerHTML = `
      <div class="empty-state">
        <span>${icon("chat")}</span>
        <h3>Todavía no hay grupos para este filtro</h3>
        <p>Podés volver a ver todos los grupos disponibles en Valencia.</p>
        <div class="empty-actions"><button class="empty-primary" onclick="resetGroupFilters()">Ver todos</button></div>
      </div>`;
    return;
  }
  directory.innerHTML = groups.map(g => `
    <a href="#" class="group-card" onclick="return openCommunityGroup(event,'${g.url}')">
      <span>${icon(g.icon)}</span>
      <div>
        <strong>${safe(g.name)}</strong>
        <small>${safe(g.description)}</small>
      </div>
      <span class="join">UNIRME →</span>
    </a>
  `).join("");
}

function resetGroupFilters(){
  groupFilter = "todos";
  document.querySelectorAll(".group-filter").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.groupFilter === "todos");
  });
  renderGroups();
}

function openCommunityGroup(e,url){
  e.preventDefault();
  window.open(url,"_blank","noopener");
  return false;
}

document.querySelectorAll(".group-filter").forEach(btn=>{
  btn.addEventListener("click",()=>{
    groupFilter = btn.dataset.groupFilter;
    document.querySelectorAll(".group-filter").forEach(x=>x.classList.toggle("active",x===btn));
    renderGroups();
  });
});

document.getElementById("groupCity").addEventListener("change",renderGroups);
function renderContact(contact){
  if(!contact) return `${icon("chat")} <span>Contacto no especificado</span>`;

  const c = contact.trim();

  if(c.startsWith("@")){
    const user = c.substring(1);
    return `${icon("chat")} <a href="https://instagram.com/${safe(user)}" target="_blank" rel="noopener">Contactar por Instagram</a>`;
  }

  if(c.includes("@") && c.includes(".")){
    return `${icon("chat")} <a href="mailto:${safe(c)}">Enviar email</a>`;
  }

  const digits = c.replace(/\D/g,"");

  if(digits.length >= 9){
    return `${icon("chat")} <a href="https://wa.me/${digits}" target="_blank" rel="noopener">Contactar por WhatsApp</a>`;
  }

  if(c.startsWith("http://") || c.startsWith("https://")){
    return `${icon("arrow")} <a href="${safe(c)}" target="_blank" rel="noopener">Abrir contacto</a>`;
  }

  return `${icon("chat")} <span>Contacto: ${safe(c)}</span>`;
}

let openedListingId = null;

function findListing(id) {
  return supabaseListings.find(listing => String(listing.id) === String(id));
}

function reportListingById(id) {
  const listing = findListing(id);
  if (listing) reportListing(listing.title);
}

function listingShareUrl(id) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("anuncio", id);
  url.hash = "anuncios";
  return url.toString();
}

function setDetailImage(index) {
  const listing = findListing(openedListingId);
  const mainImage = document.getElementById("listingDetailImage");
  if (!listing || !mainImage || !listing.images[index]) return;
  mainImage.src = listing.images[index];
  mainImage.alt = `${listing.title} · imagen ${index + 1}`;
  document.querySelectorAll(".listing-detail-thumb").forEach((button, buttonIndex) => {
    button.classList.toggle("active", buttonIndex === index);
  });
}

function openListingDetail(id, initialImage = 0) {
  const listing = findListing(id);
  if (!listing) return;

  closeListingDetail(false);
  openedListingId = String(id);
  const modal = document.createElement("div");
  modal.id = "listingDetailModal";
  modal.className = "listing-detail-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "listingDetailTitle");

  const gallery = listing.images.length
    ? `<div class="listing-detail-gallery">
        <div class="listing-detail-main"><img id="listingDetailImage" src="${safe(listing.images[initialImage] || listing.images[0])}" alt="${safe(listing.title)}"></div>
        ${listing.images.length > 1 ? `<div class="listing-detail-thumbs">${listing.images.map((image, index) => `<button type="button" class="listing-detail-thumb ${index === initialImage ? "active" : ""}" data-detail-image="${index}" aria-label="Ver imagen ${index + 1}"><img src="${safe(image)}" alt=""></button>`).join("")}</div>` : ""}
      </div>`
    : `<div class="listing-detail-placeholder listing-placeholder-${safe(listing.category)}"><span>${icon(categoryIcons[listing.category] || "doc")}</span><small>${categoryPlaceholderLabels[listing.category] || "PUBLICACIÓN"}</small></div>`;

  modal.innerHTML = `
    <button class="listing-detail-backdrop" type="button" aria-label="Cerrar publicación"></button>
    <div class="listing-detail-card category-${safe(listing.category)}">
      <button class="listing-detail-close" type="button" aria-label="Cerrar publicación">×</button>
      ${gallery}
      <div class="listing-detail-content">
        <div class="listing-detail-meta">
          <div>${listing.featured ? `<span class="featured-badge">DESTACADO</span>` : ""}<span class="badge">${labels[listing.category] || "PUBLICACIÓN"}</span></div>
          <span>${safe(listing.age)}</span>
        </div>
        <h2 id="listingDetailTitle">${safe(listing.title)}</h2>
        <div class="listing-detail-facts"><span>${icon("pin")} ${safe(listing.location)}</span><strong>${renderPrice(listing.price)}</strong></div>
        <p>${safe(listing.description)}</p>
        <div class="listing-detail-contact">${renderContact(listing.contact)}</div>
        <div class="listing-detail-safety"><strong>Antes de acordar</strong><span>Verificá identidad, condiciones y existencia. Me Fui de Argentina no recibe ni intermedia pagos.</span></div>
        <div class="listing-detail-actions">
          <button type="button" class="btn btn-blue" id="shareListingDetail">Compartir publicación</button>
          <button type="button" class="listing-detail-report" id="reportListingDetail">Reportar</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.body.classList.add("modal-open");
  modal.querySelector(".listing-detail-backdrop").addEventListener("click", closeListingDetail);
  modal.querySelector(".listing-detail-close").addEventListener("click", closeListingDetail);
  modal.querySelectorAll("[data-detail-image]").forEach(button => {
    button.addEventListener("click", () => setDetailImage(Number(button.dataset.detailImage)));
  });
  modal.querySelector("#shareListingDetail").addEventListener("click", () => shareListing(id));
  modal.querySelector("#reportListingDetail").addEventListener("click", () => {
    closeListingDetail();
    reportListing(listing.title);
  });

  const url = new URL(window.location.href);
  url.searchParams.set("anuncio", id);
  history.replaceState({}, "", `${url.pathname}${url.search}#anuncios`);
  modal.querySelector(".listing-detail-close").focus();
}

function closeListingDetail(updateUrl = true) {
  document.getElementById("listingDetailModal")?.remove();
  document.body.classList.remove("modal-open");
  openedListingId = null;
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.delete("anuncio");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

async function shareListing(id) {
  const listing = findListing(id);
  if (!listing) return;
  const shareData = {
    title: listing.title,
    text: `${listing.title} · ${listing.location}`,
    url: listingShareUrl(id)
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard.writeText(shareData.url);
    showGlobalToast("Enlace copiado");
  } catch (error) {
    if (error?.name !== "AbortError") showGlobalToast("No pudimos compartir el enlace");
  }
}

function showGlobalToast(message) {
  document.querySelector(".global-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "global-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2400);
}

function openListingFromUrl() {
  const id = new URL(window.location.href).searchParams.get("anuncio");
  if (id && id !== openedListingId && findListing(id)) openListingDetail(id);
}

function openImage(url){
  const viewer = document.createElement("div");
  viewer.className = "image-viewer";

  viewer.innerHTML = `
    <div class="image-viewer-bg" onclick="this.parentElement.remove()"></div>
    <img src="${url}" alt="Imagen ampliada">
  `;

  document.body.appendChild(viewer);
}

const planCategoryLabels={"mateadas":"Mateadas","after-office":"After office","deportes":"Deportes","salidas":"Salidas","networking":"Networking","nuevos":"Nuevos en la ciudad","idiomas":"Idiomas / intercambio","otros":"Otros"};
let socialPlans=[];
let socialPlansLoaded=false;

function formatPlanDate(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return "Fecha a confirmar";
  return new Intl.DateTimeFormat("es-ES",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(date).replace(","," ·");
}

function planContactUrl(contact){
  const value=String(contact||"").trim();
  if(!value) return null;
  if(/^https?:\/\//i.test(value)) return value;
  if(value.startsWith("@")) return `https://instagram.com/${value.slice(1).replace(/[^a-z0-9._]/gi,"")}`;
  if(value.includes("@")&&value.includes(".")) return `mailto:${value}`;
  const digits=value.replace(/\D/g,"");
  if(digits.length>=9) return `https://wa.me/${digits}`;
  return null;
}

async function loadSocialPlans(){
  const grid=document.getElementById("socialPlansGrid");
  if(!grid) return;
  const {data,error}=await supabaseClient.from("planes_sociales").select("*").eq("estado","aprobado").gte("fecha_evento",new Date().toISOString()).order("destacado",{ascending:false}).order("fecha_evento",{ascending:true});
  if(error){
    console.error("Error cargando planes sociales:",error);
    grid.innerHTML=`<div class="plan-empty"><span>${icon("heart")}</span><h4>Estamos preparando los primeros planes</h4><p>La nueva agenda social se está activando. Mientras tanto, podés proponer una juntada para la comunidad.</p><button class="btn btn-social" type="button" onclick="openPlanProposal()">Proponer un plan</button></div>`;
    return;
  }
  socialPlans=(data||[]).map(plan=>({id:String(plan.id),title:plan.titulo,city:plan.ciudad,category:plan.categoria,description:plan.descripcion,date:plan.fecha_evento,capacity:plan.cupo,interested:Number(plan.interesados_count||0),contact:plan.contacto,organizer:plan.organizador,featured:plan.destacado===true}));
  socialPlansLoaded=true;
  renderSocialPlans();
}

function renderSocialPlans(){
  const grid=document.getElementById("socialPlansGrid");
  if(!grid||!socialPlansLoaded) return;
  const city=document.getElementById("planCityFilter")?.value||"todas";
  const category=document.getElementById("planCategoryFilter")?.value||"todas";
  const normalize=value=>String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  const filtered=socialPlans.filter(plan=>(city==="todas"||normalize(plan.city)===normalize(city))&&(category==="todas"||plan.category===category));
  if(!filtered.length){
    grid.innerHTML=`<div class="plan-empty"><span>${icon("calendar")}</span><h4>No hay planes con estos filtros todavía</h4><p>La mejor manera de activar la comunidad es proponer algo simple. Una mateada, una salida o un partido ya alcanza para empezar.</p><button class="btn btn-social" type="button" onclick="openPlanProposal()">Proponer el primero</button></div>`;
    return;
  }
  grid.innerHTML=filtered.map(plan=>{
    const isComplete=plan.capacity&&plan.interested>=Number(plan.capacity);
    const capacityText=plan.capacity?`${plan.interested} interesados · cupo ${plan.capacity}`:`${plan.interested} ${plan.interested===1?"persona interesada":"personas interesadas"}`;
    const joined=hasPlanInterest(plan.id);
    return `<article class="plan-card" data-category="${safe(plan.category)}"><div class="plan-card-head"><span class="plan-category">${safe(planCategoryLabels[plan.category]||"Otros")}</span><span class="plan-status ${isComplete?"complete":""}"><i></i>${isComplete?"Completo":"Activo"}</span></div>${plan.featured?'<div class="plan-featured">★ PLAN DESTACADO</div>':""}<h4>${safe(plan.title)}</h4><p>${safe(plan.description)}</p><div class="plan-facts"><span>${icon("pin")} ${safe(plan.city)}</span><span>${icon("calendar")} ${safe(formatPlanDate(plan.date))}</span><span>${icon("people")} ${safe(capacityText)}</span></div><div class="plan-organizer">Organiza <strong>${safe(plan.organizer||"la comunidad")}</strong></div><button class="plan-join" type="button" ${isComplete&&!joined?"disabled":""} onclick="joinSocialPlan('${safe(plan.id)}')">${isComplete&&!joined?"Cupo completo":joined?"Ver contacto →":"Me sumo →"}</button></article>`;
  }).join("");
}

function storageGet(key){try{return localStorage.getItem(key)}catch{return null}}
function storageSet(key,value){try{localStorage.setItem(key,value)}catch{}}
function getCommunityClientId(){
  let id=storageGet("mf-community-client");
  if(id&&/^[0-9a-f-]{36}$/i.test(id)) return id;
  id=crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,char=>{const value=Math.random()*16|0;return (char==="x"?value:(value&3|8)).toString(16)});
  storageSet("mf-community-client",id);
  return id;
}
function hasPlanInterest(id){return storageGet(`mf-plan-interest-${id}`)==="1"}

async function joinSocialPlan(id){
  const plan=socialPlans.find(item=>item.id===String(id));
  if(!plan) return;
  const url=planContactUrl(plan.contact);
  if(url) window.open(url,"_blank","noopener");
  else navigator.clipboard?.writeText(plan.contact).then(()=>showGlobalToast("Contacto copiado"));
  if(hasPlanInterest(id)) return;
  storageSet(`mf-plan-interest-${id}`,"1");
  plan.interested+=1;
  renderSocialPlans();
  const {data,error}=await supabaseClient.rpc("registrar_interes_plan",{p_plan_id:Number(id),p_client_id:getCommunityClientId()});
  if(error){
    console.error("Error registrando interés:",error);
    storageSet(`mf-plan-interest-${id}`,"0");
    plan.interested=Math.max(0,plan.interested-1);
    renderSocialPlans();
    showGlobalToast("Abrimos el contacto, pero no pudimos actualizar el contador.");
    return;
  }
  if(Number.isFinite(Number(data))) plan.interested=Number(data);
  renderSocialPlans();
}

function goToSocialPlans(openForm=false){
  document.getElementById("comunidad-social")?.scrollIntoView({behavior:"smooth"});
  chatbotPanel?.classList.remove("open");
  chatbotButton?.setAttribute("aria-expanded","false");
  if(openForm) window.setTimeout(openPlanProposal,450);
}

function openPlanProposal(){
  const proposal=document.getElementById("planProposal");
  if(!proposal) return;
  proposal.hidden=false;
  document.getElementById("openPlanForm")?.setAttribute("aria-expanded","true");
  proposal.scrollIntoView({behavior:"smooth",block:"start"});
  window.setTimeout(()=>document.getElementById("planTitle")?.focus(),450);
}

document.getElementById("openPlanForm")?.addEventListener("click",openPlanProposal);
document.getElementById("planCityFilter")?.addEventListener("change",renderSocialPlans);
document.getElementById("planCategoryFilter")?.addEventListener("change",renderSocialPlans);
const planDateInput=document.getElementById("planDate");
if(planDateInput){const now=new Date(Date.now()-new Date().getTimezoneOffset()*60000);planDateInput.min=now.toISOString().slice(0,16)}

document.getElementById("planForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  const status=document.getElementById("planFormStatus");
  const submit=document.getElementById("planSubmit");
  const selectedDate=new Date(document.getElementById("planDate").value);
  if(selectedDate<=new Date()){status.className="status error";status.textContent="Elegí una fecha futura para el plan.";return}
  submit.disabled=true;submit.textContent="Enviando propuesta…";status.className="status";status.textContent="Guardando el plan…";
  const capacityValue=document.getElementById("planCapacity").value;
  const proposal={titulo:document.getElementById("planTitle").value.trim(),ciudad:document.getElementById("planCity").value,categoria:document.getElementById("planCategory").value,fecha_evento:selectedDate.toISOString(),cupo:capacityValue?Number(capacityValue):null,descripcion:document.getElementById("planDescription").value.trim(),contacto:document.getElementById("planContact").value.trim(),organizador:document.getElementById("planOrganizer").value.trim(),estado:"pendiente",destacado:false};
  const {error}=await supabaseClient.from("planes_sociales").insert([proposal]);
  submit.disabled=false;submit.textContent="Enviar para revisión";
  if(error){console.error("Error enviando plan:",error);status.className="status error";status.textContent="No pudimos enviar el plan. Probá nuevamente en unos minutos.";return}
  form.reset();status.className="status success";status.innerHTML="<strong>Plan recibido.</strong><br>Lo revisaremos antes de que aparezca en la agenda.";
});

const CHAT_DAYS_VISIBLE=15;
let communityChatMessages=[];
let communityChatChannel=null;
let selectedChatReportId=null;

function formatChatTime(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return "Ahora";
  const today=new Date();
  const sameDay=date.toDateString()===today.toDateString();
  return new Intl.DateTimeFormat("es-ES",sameDay?{hour:"2-digit",minute:"2-digit"}:{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(date);
}

function renderCommunityChat(scrollToEnd=false){
  const container=document.getElementById("communityChatMessages");
  if(!container) return;
  if(!communityChatMessages.length){
    container.innerHTML='<div class="chat-empty"><strong>Todavía nadie rompió el hielo.</strong>Podés ser la primera persona en saludar o proponer algo.</div>';
    return;
  }
  container.innerHTML=communityChatMessages.map(item=>`<article class="community-message"><div class="community-message-head"><strong>${safe(item.apodo)}</strong><time datetime="${safe(item.created_at)}">${safe(formatChatTime(item.created_at))}</time></div><p>${safe(item.mensaje)}</p><div class="community-message-actions"><button type="button" onclick="turnChatIntoPlan('${safe(item.id)}')">Proponer como plan</button><button type="button" onclick="openChatReport('${safe(item.id)}')">Reportar</button></div></article>`).join("");
  if(scrollToEnd) container.scrollTop=container.scrollHeight;
}

async function loadCommunityChat(scrollToEnd=false){
  const container=document.getElementById("communityChatMessages");
  if(!container) return;
  const city=document.getElementById("chatCity")?.value||"Valencia";
  const since=new Date(Date.now()-CHAT_DAYS_VISIBLE*86400000).toISOString();
  const {data,error}=await supabaseClient.from("chat_mensajes").select("id,ciudad,apodo,mensaje,plan_id,created_at").eq("ciudad",city).eq("estado","visible").gte("created_at",since).order("created_at",{ascending:true}).limit(60);
  if(error){
    console.error("Error cargando chat:",error);
    container.innerHTML='<div class="chat-empty"><strong>El chat está casi listo.</strong>Falta activar la actualización de Supabase para empezar a conversar.</div>';
    document.getElementById("chatPresence").innerHTML="<i></i> Próximamente";
    return;
  }
  communityChatMessages=data||[];
  renderCommunityChat(scrollToEnd);
}

async function connectCommunityChat(){
  const city=document.getElementById("chatCity")?.value||"Valencia";
  storageSet("mf-chat-city",city);
  if(communityChatChannel) await supabaseClient.removeChannel(communityChatChannel);
  await loadCommunityChat(true);
  const room=`comunidad-${city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-")}`;
  communityChatChannel=supabaseClient.channel(room,{config:{presence:{key:getCommunityClientId()}}});
  communityChatChannel
    .on("presence",{event:"sync"},()=>{
      const count=Object.keys(communityChatChannel.presenceState()).length;
      document.getElementById("chatPresence").innerHTML=`<i></i> ${count||1} ${count===1?"persona conectada":"personas conectadas"}`;
    })
    .on("postgres_changes",{event:"*",schema:"public",table:"chat_mensajes",filter:`ciudad=eq.${city}`},()=>loadCommunityChat(true))
    .subscribe(async status=>{
      if(status==="SUBSCRIBED") await communityChatChannel.track({online_at:new Date().toISOString()});
      if(status==="CHANNEL_ERROR"||status==="TIMED_OUT") document.getElementById("chatPresence").innerHTML="<i></i> Conexión lenta";
    });
}

function turnChatIntoPlan(id){
  const source=id?communityChatMessages.find(item=>String(item.id)===String(id)):null;
  const draft=source?.mensaje||document.getElementById("chatMessage")?.value.trim()||"";
  openPlanProposal();
  const city=document.getElementById("chatCity")?.value||"Valencia";
  document.getElementById("planCity").value=city;
  document.getElementById("planCategory").value="otros";
  if(draft){
    const clean=draft.replace(/[!?¿¡]+/g,"").trim();
    document.getElementById("planTitle").value=clean.slice(0,77)+(clean.length>77?"…":"");
    document.getElementById("planDescription").value=`Plan surgido del chat de ${city}: ${draft}`.slice(0,500);
  }
}

function openChatReport(id){
  selectedChatReportId=id;
  const modal=document.getElementById("chatReportModal");
  modal.hidden=false;
  document.getElementById("chatReportStatus").textContent="";
  document.getElementById("chatReportComment").value="";
}
function closeChatReport(){document.getElementById("chatReportModal").hidden=true;selectedChatReportId=null}

document.getElementById("communityChatForm")?.addEventListener("submit",async event=>{
  event.preventDefault();
  const nickname=document.getElementById("chatNickname").value.trim();
  const message=document.getElementById("chatMessage").value.trim();
  const status=document.getElementById("chatFormStatus");
  const send=document.getElementById("chatSend");
  if(document.getElementById("chatWebsite").value) return;
  if(nickname.length<2||message.length<2){status.className="status error";status.textContent="Escribí un apodo y un mensaje.";return}
  storageSet("mf-chat-nickname",nickname);
  send.disabled=true;send.textContent="Enviando…";status.textContent="";
  const {error}=await supabaseClient.rpc("publicar_mensaje_chat",{p_client_id:getCommunityClientId(),p_ciudad:document.getElementById("chatCity").value,p_apodo:nickname,p_mensaje:message});
  send.disabled=false;send.textContent="Enviar mensaje";
  if(error){
    console.error("Error enviando mensaje:",error);
    status.className="status error";
    status.textContent=String(error.message).includes("RATE_LIMIT")?"Esperá unos segundos antes de volver a escribir.":String(error.message).includes("HOURLY_LIMIT")?"Llegaste al límite temporal de mensajes. Probá más tarde.":"No pudimos enviar el mensaje. Probá nuevamente.";
    return;
  }
  document.getElementById("chatMessage").value="";document.getElementById("chatCharacterCount").textContent="0/280";
  status.className="status";status.textContent="Mensaje enviado.";
  await loadCommunityChat(true);
  window.setTimeout(()=>{if(status.textContent==="Mensaje enviado.") status.textContent=""},2500);
});

document.querySelectorAll("[data-chat-prompt]").forEach(button=>button.addEventListener("click",()=>{
  const input=document.getElementById("chatMessage");input.value=button.dataset.chatPrompt;input.focus();document.getElementById("chatCharacterCount").textContent=`${input.value.length}/280`;
}));
document.getElementById("chatMessage")?.addEventListener("input",event=>{document.getElementById("chatCharacterCount").textContent=`${event.target.value.length}/280`});
document.getElementById("chatCreatePlan")?.addEventListener("click",()=>turnChatIntoPlan(null));
document.getElementById("chatCity")?.addEventListener("change",connectCommunityChat);
document.getElementById("chatReportClose")?.addEventListener("click",closeChatReport);
document.getElementById("chatReportModal")?.addEventListener("click",event=>{if(event.target.id==="chatReportModal") closeChatReport()});
document.getElementById("chatReportSend")?.addEventListener("click",async()=>{
  if(!selectedChatReportId) return;
  const button=document.getElementById("chatReportSend");const status=document.getElementById("chatReportStatus");
  button.disabled=true;button.textContent="Enviando…";
  const {error}=await supabaseClient.rpc("reportar_mensaje_chat",{p_mensaje_id:Number(selectedChatReportId),p_motivo:document.getElementById("chatReportReason").value,p_comentario:document.getElementById("chatReportComment").value.trim()||null});
  button.disabled=false;button.textContent="Enviar reporte";
  if(error){status.className="status error";status.textContent="No pudimos enviar el reporte.";return}
  status.className="status success";status.textContent="Reporte recibido. Gracias por avisar.";
  window.setTimeout(closeChatReport,1200);
});

const savedChatCity=storageGet("mf-chat-city");
if(savedChatCity&&[...document.getElementById("chatCity")?.options||[]].some(option=>option.value===savedChatCity)) document.getElementById("chatCity").value=savedChatCity;
document.getElementById("chatNickname").value=storageGet("mf-chat-nickname")||"";
connectCommunityChat();

renderGroups();
loadApprovedListings();
loadCommunityGroups();
loadSocialPlans();
const chatbotButton = document.getElementById("chatbotButton");
const chatbotPanel = document.getElementById("chatbotPanel");
const chatbotClose = document.getElementById("chatbotClose");
const chatConversation = document.getElementById("chatConversation");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

if (chatbotButton && chatbotPanel) {
  chatbotButton.addEventListener("click", () => {
    chatbotPanel.classList.toggle("open");
    chatbotButton.setAttribute("aria-expanded", chatbotPanel.classList.contains("open"));
    if (chatbotPanel.classList.contains("open")) {
      window.setTimeout(() => chatInput?.focus(), 120);
    }
  });
}

if (chatbotClose && chatbotPanel) {
  chatbotClose.addEventListener("click", () => {
    chatbotPanel.classList.remove("open");
    chatbotButton?.setAttribute("aria-expanded", "false");
  });
}

function normalizeChatText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function addChatMessage(text, role = "bot", actions = []) {
  if (!chatConversation) return;
  const message = document.createElement("div");
  message.className = `chat-message ${role === "user" ? "user-message" : "bot-message"}`;

  if (role !== "user") {
    const avatar = document.createElement("span");
    avatar.className = "chat-avatar";
    avatar.textContent = "MF";
    message.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  bubble.appendChild(paragraph);

  if (actions.length) {
    const actionRow = document.createElement("div");
    actionRow.className = "chat-actions";
    actions.forEach(action => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.addEventListener("click", () => handleChatAction(action));
      actionRow.appendChild(button);
    });
    bubble.appendChild(actionRow);
  }

  message.appendChild(bubble);
  chatConversation.appendChild(message);
  chatConversation.scrollTop = chatConversation.scrollHeight;
}

function getChatReply(rawText) {
  const text = normalizeChatText(rawText);

  if (/hola|buenas|buen dia|buenas tardes|buenas noches/.test(text)) {
    return { text: "¡Buenas! Puedo orientarte con vivienda, trabajo, grupos, publicaciones, lugares argentinos y servicios en Valencia.", actions: [] };
  }
  if (/vivienda|alquiler|habitacion|piso|casa|alojamiento/.test(text)) {
    return {
      text: "Te muestro las publicaciones de vivienda. Antes de reservar, verificá identidad, condiciones y que el alojamiento exista.",
      actions: [
        { label: "Ver vivienda", type: "listings", value: "vivienda" },
        { label: "Consejos de seguridad", type: "section", value: "seguridad" }
      ]
    };
  }
  if (/trabajo|empleo|curro|oferta laboral|cv|curriculum/.test(text)) {
    return {
      text: "Podés revisar las publicaciones de trabajo disponibles. Si todavía no aparece lo tuyo, probá también el grupo de la comunidad.",
      actions: [
        { label: "Ver trabajo", type: "listings", value: "trabajo" },
        { label: "Ir a grupos", type: "groups" }
      ]
    };
  }
  if (/proponer.*(plan|juntada)|crear.*(plan|juntada)|organizar.*(plan|juntada)/.test(text)) {
    return {
      text: "¡Dale! Podés proponer una actividad sin registrarte. La revisamos antes de publicarla y tu contacto solo se muestra si queda aprobada.",
      actions: [{ label: "Proponer una juntada", type: "propose-plan" }]
    };
  }
  if (/chat|charlar|hablar con gente|conversacion/.test(text)) {
    return {
      text: "Entrá al chat público de tu ciudad, presentate y encontrá gente con ganas de hacer algo. No necesitás registrarte.",
      actions: [{ label: "Entrar al chat", type: "chat-room" }]
    };
  }
  if (/conocer gente|amistad|hacer amigos|juntada|mateada|after office|salida|planes|futbol|voley/.test(text)) {
    return {
      text: "Hay una agenda de planes para conocer gente y activar juntadas. Podés sumarte a una propuesta o crear la tuya.",
      actions: [
        { label: "Ver planes", type: "social" },
        { label: "Proponer un plan", type: "propose-plan" }
      ]
    };
  }
  if (/grupo|whatsapp|comunidad/.test(text)) {
    return {
      text: "Valencia es nuestra primera comunidad activa. Ahí podés encontrar grupos por intereses y necesidades.",
      actions: [{ label: "Ver grupos de Valencia", type: "groups" }]
    };
  }
  if (/publicar|publicacion|anuncio|vendo|ofrezco|busco compartir/.test(text)) {
    return {
      text: "Podés publicar gratis. Revisamos el anuncio antes de mostrarlo para cuidar la calidad de la comunidad.",
      actions: [{ label: "Crear publicación", type: "publish" }]
    };
  }
  if (/gestor|gestoria|abogado|psicolog|mudanza|profesional|servicio|tramite|nie|tie|inmobiliaria|agencia inmobiliaria|seguro|poliza/.test(text)) {
    return {
      text: "Estamos preparando la red profesional en Valencia. Todavía no mostramos perfiles hasta que estén listos para recibir consultas.",
      actions: [
        { label: "Ver servicios", type: "section", value: "servicios" },
        { label: "Presentar mi servicio", type: "instagram" }
      ]
    };
  }
  if (/tienda|productos argentinos|producto argentino|mate|yerba|alfajor|restaurante|cafeteria|comida argentina|empanada|parrilla|comercio latino|tienda latina/.test(text)) {
    return {
      text: "Estamos preparando un directorio de tiendas, productos, mate y gastronomía argentina en Valencia. Publicaremos lugares reales a medida que los revisemos.",
      actions: [
        { label: "Ver futuro directorio", type: "section", value: "lugares" },
        { label: "Compartir un lugar", type: "instagram" }
      ]
    };
  }
  if (/ciudad|madrid|barcelona|malaga|alicante|sevilla|bilbao|donde vivir|valencia/.test(text)) {
    return {
      text: "Si estás comparando ciudades, el test puede ayudarte a ordenar preferencias de clima, tamaño y estilo de vida.",
      actions: [{ label: "Hacer el test", type: "quiz" }]
    };
  }
  if (/estafa|segur|pago|transferencia|reserva|sospech|report/.test(text)) {
    return {
      text: "No intermediamos pagos. Nunca transfieras una reserva sin verificar a la persona, las condiciones y la existencia del alojamiento o servicio.",
      actions: [{ label: "Ver recomendaciones", type: "section", value: "seguridad" }]
    };
  }
  if (/negocio|marca|colaboracion|publicidad|destacar|patrocin/.test(text)) {
    return {
      text: "Tenemos opciones para negocios y colaboraciones, cuidando que lo destacado o patrocinado se identifique con claridad.",
      actions: [
        { label: "Ver opciones", type: "business" },
        { label: "Contactar", type: "instagram" }
      ]
    };
  }

  return {
    text: "Todavía estoy aprendiendo. Probá preguntarme por vivienda, trabajo, grupos, lugares argentinos, publicar, ciudades, seguridad o servicios profesionales.",
    actions: [
      { label: "Explorar publicaciones", type: "section", value: "anuncios" },
      { label: "Ver grupos", type: "groups" }
    ]
  };
}

function handleChatAction(action) {
  if (action.type === "listings") goToListings(action.value);
  if (action.type === "groups") goToGroups();
  if (action.type === "social") goToSocialPlans();
  if (action.type === "chat-room") goToCommunityChat();
  if (action.type === "propose-plan") goToSocialPlans(true);
  if (action.type === "publish") goToPublish();
  if (action.type === "quiz") goToCityQuiz();
  if (action.type === "business") goToBusiness();
  if (action.type === "instagram") contactCollaborations();
  if (action.type === "section") {
    document.getElementById(action.value)?.scrollIntoView({ behavior: "smooth" });
    chatbotPanel?.classList.remove("open");
    chatbotButton?.setAttribute("aria-expanded", "false");
  }
}

function goToCommunityChat(){
  document.getElementById("chat-comunidad")?.scrollIntoView({behavior:"smooth",block:"start"});
  chatbotPanel?.classList.remove("open");
  chatbotButton?.setAttribute("aria-expanded","false");
  window.setTimeout(()=>document.getElementById("chatMessage")?.focus(),450);
}

function askChat(question) {
  const cleanQuestion = String(question || "").trim();
  if (!cleanQuestion) return;
  addChatMessage(cleanQuestion, "user");
  const reply = getChatReply(cleanQuestion);
  window.setTimeout(() => addChatMessage(reply.text, "bot", reply.actions), 240);
}

document.querySelectorAll("[data-chat-question]").forEach(button => {
  button.addEventListener("click", () => askChat(button.dataset.chatQuestion));
});

chatForm?.addEventListener("submit", event => {
  event.preventDefault();
  const question = chatInput?.value;
  if (chatInput) chatInput.value = "";
  askChat(question);
});
function goToGroups() {
  const groupsSection = document.getElementById("grupos");

  if (groupsSection) {
    groupsSection.scrollIntoView({
      behavior: "smooth"
    });
  }

  chatbotPanel.classList.remove("open");
}
function goToPublish() {
  const publishSection = document.getElementById("publicar");

  if (publishSection) {
    publishSection.scrollIntoView({
      behavior: "smooth"
    });
  }

  chatbotPanel.classList.remove("open");
}

function goToListings(category) {
  const listingsSection = document.getElementById("anuncios");

  const filterButton = document.querySelector(
    `.filter[data-filter="${category}"]`
  );

  if (filterButton) {
    filterButton.click();
  }

  if (listingsSection) {
    listingsSection.scrollIntoView({
      behavior: "smooth"
    });
  }

  chatbotPanel.classList.remove("open");
}

function showCityQuizSoon() {
  alert("🇪🇸 Muy pronto vas a poder descubrir qué ciudad de España encaja mejor con vos.");
  chatbotPanel.classList.remove("open");
}
function contactCollaborations() {
  window.open(
    "https://www.instagram.com/mefuideargentina",
    "_blank",
    "noopener"
  );

  chatbotPanel.classList.remove("open");
}
const startCityQuiz = document.getElementById("startCityQuiz");
const cityQuizStart = document.getElementById("cityQuizStart");
const cityQuizContent = document.getElementById("cityQuizContent");

const cityQuizQuestions = [
  {
    question: "¿Qué clima preferís?",
    answers: [
      { text: "☀️ Calor y mucho sol", points: { Malaga: 3, Sevilla: 3, Alicante: 2, Valencia: 2 } },
      { text: "🌤️ Clima templado", points: { Valencia: 3, Alicante: 3, Barcelona: 2, Malaga: 2 } },
      { text: "❄️ Fresco y estaciones marcadas", points: { Bilbao: 3, Madrid: 2, Barcelona: 1 } }
    ]
  },
  {
    question: "¿Qué tamaño de ciudad te gusta más?",
    answers: [
      { text: "🏙️ Grande, con de todo", points: { Madrid: 3, Barcelona: 3, Valencia: 1 } },
      { text: "🌆 Mediana y activa", points: { Valencia: 3, Malaga: 2, Alicante: 2, Bilbao: 2 } },
      { text: "🌿 Más tranquila", points: { Alicante: 3, Malaga: 2, Sevilla: 2 } }
    ]
  },
  {
    question: "¿Qué tan importante es tener mar cerca?",
    answers: [
      { text: "🌊 Imprescindible", points: { Valencia: 3, Barcelona: 3, Malaga: 3, Alicante: 3, Bilbao: 2 } },
      { text: "🙂 Me gusta, pero no es decisivo", points: { Madrid: 2, Sevilla: 2, Valencia: 2, Barcelona: 2 } },
      { text: "⛰️ Me da igual, prefiero otras cosas", points: { Madrid: 3, Bilbao: 2, Sevilla: 2 } }
    ]
  },
  {
    question: "¿Qué tan importante es gastar poco en alquiler?",
    answers: [
      { text: "💸 Muchísimo", points: { Alicante: 3, Sevilla: 3, Malaga: 2 } },
      { text: "⚖️ Busco equilibrio", points: { Valencia: 3, Malaga: 2, Bilbao: 2 } },
      { text: "💳 Puedo pagar más si la ciudad lo vale", points: { Madrid: 3, Barcelona: 3, Valencia: 1 } }
    ]
  },
  {
    question: "¿Qué ritmo de vida preferís?",
    answers: [
      { text: "⚡ Mucho movimiento", points: { Madrid: 3, Barcelona: 3 } },
      { text: "👌 Equilibrado", points: { Valencia: 3, Malaga: 2, Bilbao: 2 } },
      { text: "😌 Más tranquilo", points: { Alicante: 3, Sevilla: 2, Malaga: 2 } }
    ]
  },
  {
    question: "¿Qué priorizás más al elegir ciudad?",
    answers: [
      { text: "💼 Trabajo y oportunidades", points: { Madrid: 3, Barcelona: 3, Valencia: 2 } },
      { text: "🍻 Vida social y planes", points: { Madrid: 3, Barcelona: 3, Valencia: 2, Malaga: 2 } },
      { text: "❤️ Calidad de vida", points: { Valencia: 3, Malaga: 3, Alicante: 2, Bilbao: 2 } }
    ]
  }
];

let cityQuizCurrentQuestion = 0;

let cityQuizScores = {
  Madrid: 0,
  Barcelona: 0,
  Valencia: 0,
  Malaga: 0,
  Alicante: 0,
  Sevilla: 0,
  Bilbao: 0
};

if (startCityQuiz && cityQuizStart && cityQuizContent) {
  startCityQuiz.addEventListener("click", () => {
    cityQuizStart.style.display = "none";
    cityQuizContent.style.display = "block";

    cityQuizCurrentQuestion = 0;

    cityQuizScores = {
      Madrid: 0,
      Barcelona: 0,
      Valencia: 0,
      Malaga: 0,
      Alicante: 0,
      Sevilla: 0,
      Bilbao: 0
    };

    renderCityQuizQuestion();
  });
}

function renderCityQuizQuestion() {
  const question = cityQuizQuestions[cityQuizCurrentQuestion];

  cityQuizContent.innerHTML = `
    <div class="quiz-question">
      <span class="quiz-step">
        Pregunta ${cityQuizCurrentQuestion + 1} de ${cityQuizQuestions.length}
      </span>

      <h3>${question.question}</h3>

      <div class="quiz-answers">
        ${question.answers.map((answer, index) => `
          <button onclick="answerCityQuiz(${index})">
            ${answer.text}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function answerCityQuiz(answerIndex) {
  const question = cityQuizQuestions[cityQuizCurrentQuestion];
  const answer = question.answers[answerIndex];

  Object.entries(answer.points).forEach(([city, points]) => {
    cityQuizScores[city] += points;
  });

  cityQuizCurrentQuestion++;

  if (cityQuizCurrentQuestion < cityQuizQuestions.length) {
    renderCityQuizQuestion();
  } else {
    showCityQuizResult();
  }
}

function showCityQuizResult() {
  const sortedCities = Object.entries(cityQuizScores)
    .sort((a, b) => b[1] - a[1]);

  const winner = sortedCities[0][0];
  const second = sortedCities[1][0];
  const third = sortedCities[2][0];

  const winnerScore = sortedCities[0][1];
  const maxPossibleScore = cityQuizQuestions.length * 3;
  const matchPercent = Math.round((winnerScore / maxPossibleScore) * 100);

  const cityNames = {
    Madrid: "Madrid",
    Barcelona: "Barcelona",
    Valencia: "Valencia",
    Malaga: "Málaga",
    Alicante: "Alicante",
    Sevilla: "Sevilla",
    Bilbao: "Bilbao"
  };

  const cityDescriptions = {
    Madrid: "Movimiento, trabajo, cultura y una ciudad que nunca para.",
    Barcelona: "Gran ciudad, mar, cultura y muchísima vida social.",
    Valencia: "Mar, buen clima y un equilibrio muy fuerte entre ciudad y calidad de vida.",
    Malaga: "Sol, costa y un ritmo relajado sin renunciar a una ciudad activa.",
    Alicante: "Mar, tranquilidad y una vida más relajada.",
    Sevilla: "Calor, cultura, vida social y mucho carácter.",
    Bilbao: "Naturaleza, gastronomía y una ciudad más fresca y tranquila."
  };

  cityQuizContent.innerHTML = `
    <div class="quiz-result">
      <span class="quiz-step">🎉 TU CIUDAD IDEAL</span>

      <div class="quiz-match">${matchPercent}% match</div>

      <h3>${cityNames[winner]}</h3>

      <p>${cityDescriptions[winner]}</p>

      <div class="quiz-alternatives">
        <strong>También podrían encajar con vos:</strong>
        <span>${cityNames[second]} · ${cityNames[third]}</span>
      </div>

      <div class="quiz-result-actions">
        ${winner === "Valencia" ? `
  <button class="btn btn-blue" onclick="goToCityListings('${winner}')">
    Ver anuncios en ${cityNames[winner]}
  </button>
` : `
  <button class="btn btn-blue" onclick="showCityComingSoon('${cityNames[winner]}')">
    Próximamente en ${cityNames[winner]}
  </button>
`}

        <button class="btn" onclick="restartCityQuiz()">
          Repetir test
        </button>
      </div>
    </div>
  `;
}

function restartCityQuiz() {
  cityQuizCurrentQuestion = 0;

  cityQuizScores = {
    Madrid: 0,
    Barcelona: 0,
    Valencia: 0,
    Malaga: 0,
    Alicante: 0,
    Sevilla: 0,
    Bilbao: 0
  };

  renderCityQuizQuestion();
}
function goToCityQuiz() {
  const quizSection = document.getElementById("cityQuiz");

  if (quizSection) {
    quizSection.scrollIntoView({
      behavior: "smooth"
    });
  }

  chatbotPanel.classList.remove("open");
}
function goToCityListings(city) {
  const citySelect = document.getElementById("citySelect");
  const listingsSection = document.getElementById("anuncios");

  const cityNames = {
    Madrid: "Madrid",
    Barcelona: "Barcelona",
    Valencia: "Valencia",
    Malaga: "Málaga",
    Alicante: "Alicante",
    Sevilla: "Sevilla",
    Bilbao: "Bilbao"
  };

  const cityName = cityNames[city];

  // Volver a mostrar todas las categorías
  currentFilter = "todos";

  document.querySelectorAll(".filter").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === "todos");
  });

  if (citySelect && cityName) {
    citySelect.value = cityName;
    currentCity = cityName;
  }

  render();

  if (listingsSection) {
    listingsSection.scrollIntoView({
      behavior: "smooth"
    });
  }
}
function showCityComingSoon(cityName) {
  alert(`🚀 Estamos preparando la comunidad en ${cityName}. Muy pronto vas a poder ver anuncios, grupos y recomendaciones.`);
}
function goToBusiness() {
  const businessSection = document.getElementById("negocios");

  if (businessSection) {
    businessSection.scrollIntoView({
      behavior: "smooth"
    });
  }

  chatbotPanel.classList.remove("open");
}
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");

if (mobileMenuButton && mobileMenu) {
  mobileMenuButton.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
    mobileMenuButton.setAttribute("aria-expanded", mobileMenu.classList.contains("open"));
  });

  mobileMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      mobileMenuButton.setAttribute("aria-expanded", "false");
    });
  });
}

const scrollProgress = document.getElementById("scrollProgress");
const desktopNavLinks = Array.from(document.querySelectorAll(".topbar nav a[href^='#']"));
const observedSections = desktopNavLinks
  .map(link => document.querySelector(link.getAttribute("href")))
  .filter(Boolean)
  .sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

function updateScrollUI() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  if (scrollProgress) scrollProgress.style.width = `${Math.min(progress, 100)}%`;

  let activeSection = observedSections[0]?.id;
  observedSections.forEach(section => {
    if (section.getBoundingClientRect().top <= 150) activeSection = section.id;
  });
  desktopNavLinks.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === `#${activeSection}`);
  });
}

window.addEventListener("scroll", updateScrollUI, { passive: true });
updateScrollUI();

const revealTargets = document.querySelectorAll(
  ".section-title, .recent-heading, .category, .social-spotlight, .plans-heading, .plan-card, .plan-proposal, .listing-card, .group-card, .journey-heading, .journey-steps, .valencia-guide-head, .valencia-guide-grid, .valencia-faq, .business-card, .service-card, .places-heading, .place-card, .safety-heading, .safety-list, .publish-info, .publish-card"
);

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -35px" });

  revealTargets.forEach(target => {
    target.classList.add("reveal");
    revealObserver.observe(target);
  });
}

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  mobileMenu?.classList.remove("open");
  mobileMenuButton?.setAttribute("aria-expanded", "false");
  chatbotPanel?.classList.remove("open");
  chatbotButton?.setAttribute("aria-expanded", "false");
  reportModal?.classList.remove("open");
  closeListingDetail();
});
let currentReportedListing = "";

function reportListing(title) {
  currentReportedListing = title;

  const modal = document.getElementById("reportModal");
  const titleElement = document.getElementById("reportListingTitle");
  const status = document.getElementById("reportStatus");
  const comment = document.getElementById("reportComment");

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (status) {
    status.textContent = "";
  }

  if (comment) {
    comment.value = "";
  }

  if (modal) {
    modal.classList.add("open");
  }
}
const reportModal = document.getElementById("reportModal");
const reportModalClose = document.getElementById("reportModalClose");
const sendReportButton = document.getElementById("sendReportButton");

if (reportModalClose && reportModal) {
  reportModalClose.addEventListener("click", () => {
    reportModal.classList.remove("open");
  });
}

if (reportModal) {
  reportModal.addEventListener("click", (e) => {
    if (e.target === reportModal) {
      reportModal.classList.remove("open");
    }
  });
}

if (sendReportButton) {
  sendReportButton.addEventListener("click", async () => {
    const reason = document.getElementById("reportReason").value;
    const comment = document.getElementById("reportComment").value.trim();
    const status = document.getElementById("reportStatus");

    status.textContent = "Enviando reporte...";

    const { error } = await supabaseClient
      .from("reportes")
      .insert({
        anuncio_titulo: currentReportedListing,
        motivo: reason,
        comentario: comment,
        estado: "pendiente"
      });

    if (error) {
      console.error("Error enviando reporte:", error);
      status.textContent = "❌ No se pudo enviar el reporte.";
      return;
    }

    status.textContent = "✅ Reporte enviado. Gracias por avisarnos.";

    setTimeout(() => {
      reportModal.classList.remove("open");
    }, 1500);
  });
}
