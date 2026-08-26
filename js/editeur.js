/* =====================================================================
   ÉDITEUR — RENDEZ-VOUS CITOYENS
   Permet de modifier les événements (format XML officiel du Crédit
   Agricole Toulouse 31) ainsi que RDV_THEMES / RDV_STATS (métadonnées
   propres au site), puis d'exporter :
     - un fichier RDVCitoyens.xml (le format métier d'origine — ce nom
       de fichier ne doit jamais être changé)
     - un fichier events-data.js (le même contenu XML "emballé" pour
       pouvoir être chargé par la page en local, sans serveur)
   ===================================================================== */

(function () {
  "use strict";

  const DRAFT_KEY = "rdvCitoyensDraft_v2";

  /* ---------------------------------------------------------------
     Utilitaires partagés avec la page (mêmes règles qu'index.html)
  --------------------------------------------------------------- */
  function normalize(str) {
    return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  const MOIS_FR = ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"];
  const MOIS_FR_ACCENT = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const JOURS_FR = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];

  function parseFrenchDate(str) {
    const m = normalize(str).match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
    if (!m) return null;
    const month = MOIS_FR.indexOf(m[2]);
    if (month === -1) return null;
    return new Date(Number(m[3]), month, Number(m[1]));
  }

  function isUpcoming(ev) {
    const s = normalize(ev.statut);
    if (s.includes("termine")) return false;
    if (s.includes("venir") || s.includes("cours")) return true;
    const d = parseFrenchDate(ev.dateEvenement);
    if (d) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return d >= today;
    }
    return false;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }
  function escapeXml(str) {
    return String(str ?? "").replace(/[&<>]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));
  }

  /* ---------------------------------------------------------------
     Lecture du XML métier -> tableau d'événements (mêmes champs que
     dans index.html)
  --------------------------------------------------------------- */
  const EVENT_TAGS = [
    ["id", "id"],
    ["dateEvenement", "Date_Evenement"],
    ["titre", "Titre"],
    ["localisation", "Localisation"],
    ["theme", "Theme"],
    ["statut", "Statut"],
    ["intervenant", "Intervenant"],
    ["horaireGen", "HoraireGen"],
    ["horaireCocktail", "HoraireCocktail"],
    ["horaireConf", "HoraireConf"],
    ["lieu", "Lieu"],
    ["adresse", "Adresse"],
    ["cp", "Cp"],
    ["nombreInscrit", "NombreInscrit"],
    ["nombrePlaceMax", "NombrePlaceMax"],
    ["description", "Description"],
    ["communesConcernees", "Communes_Concernees"],
    ["detailEvenement", "detail-evenement"],
    ["codeCaisse", "Code_caisse"],
    ["libelleCaisse", "Libelle_caisse"],
    ["dateEnvoiEmail", "Date_envoi_email"],
    ["dateEnvoiSmsJ15", "Date_envoi_sms_J15"],
    ["dateEnvoiSmsJ2", "Date_envoi_sms_J2"],
    ["image", "Image"]
  ];
  const NUMERIC_FIELDS = new Set(["nombreInscrit", "nombrePlaceMax"]);

  function parseEvenementsXML(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("XML invalide (vérifiez que toutes les balises sont bien fermées).");
    const get = (node, tag) => {
      const el = node.getElementsByTagName(tag)[0];
      return el ? el.textContent.trim() : "";
    };
    const nodes = Array.from(doc.getElementsByTagName("Evenement"));
    if (!nodes.length) throw new Error("Aucune balise <Evenement> trouvée dans ce fichier.");
    return nodes.map((node) => {
      const ev = {};
      EVENT_TAGS.forEach(([key, tag]) => {
        const raw = get(node, tag);
        ev[key] = NUMERIC_FIELDS.has(key) ? (Number(raw) || 0) : raw;
      });
      return ev;
    });
  }

  /** En-tête XML d'origine (commentaire listant les thématiques possibles) — conservé tel quel. */
  const XML_HEADER_COMMENT = `<!--
Voici les themes possible :
agriculture,
secourisme,
informatique,
cambriolage,
cambriolage2,
cybersecurite,
informatique2,
sante-viellir,
secourisme2,
securite-montagne,
securite-routiere,
succession,
secourisme2
-->`;

  function buildEvenementsXML(events) {
    const blocks = events.map((ev) => {
      const lines = EVENT_TAGS
        // "Image" est un ajout optionnel (non présent dans le XML d'origine) : on ne
        // l'écrit que si elle est réellement utilisée, pour ne pas changer le schéma
        // des événements qui ne s'en servent pas.
        .filter(([key]) => key !== "image" || ev.image)
        .map(([key, tag]) => `\t\t<${tag}>${escapeXml(ev[key] ?? "")}</${tag}>`);
      return `\t<Evenement>\n${lines.join("\n")}\n\t</Evenement>`;
    });
    return `${XML_HEADER_COMMENT}\n\n<Evenements>\n${blocks.join("\n\n")}\n</Evenements>\n`;
  }

  function buildEventsDataJs(xmlText, themes, statsOut) {
    return `/* =====================================================================
   RENDEZ-VOUS CITOYENS — DONNÉES
   Fichier généré par l'éditeur (editeur.html) le ${new Date().toLocaleString("fr-FR")}.
   RDV_XML est le contenu exact de data/RDVCitoyens.xml, recopié ici pour
   pouvoir être chargé sans serveur (voir le commentaire dans le fichier
   d'origine pour le détail du fonctionnement).
   ===================================================================== */

const RDV_XML = \`${xmlText.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\`;

const RDV_THEMES = ${JSON.stringify(themes, null, 2)};

const RDV_STATS = ${JSON.stringify(statsOut, null, 2)};
`;
  }

  /** Lit un fichier image, le redimensionne (largeur max) et renvoie un data URL JPEG léger. */
  function fileToOptimizedDataUrl(file, maxWidth) {
    maxWidth = maxWidth || 900;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Image illisible"));
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------------------------------------------------------------
     État en mémoire
  --------------------------------------------------------------- */
  let state = {
    themes: JSON.parse(JSON.stringify(RDV_THEMES)),
    stats: JSON.parse(JSON.stringify(RDV_STATS)),
    events: parseEvenementsXML(RDV_XML),
    statsAuto: { totalEvenements: true, totalParticipants: true, totalIntervenants: true, totalThemes: true }
  };

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch (e) { /* stockage indisponible, tant pis */ }
  }

  /* ---------------------------------------------------------------
     Onglets
  --------------------------------------------------------------- */
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "export") renderExportPreview();
    });
  });

  /* ---------------------------------------------------------------
     Liste des événements
  --------------------------------------------------------------- */
  function themeOf(id) { return state.themes.find((t) => t.id === id) || state.themes[state.themes.length - 1]; }

  function renderEventList() {
    const wrap = document.getElementById("event-list");
    const query = document.getElementById("event-search").value.trim().toLowerCase();
    const events = state.events
      .filter((e) => !query || (e.titre + " " + e.localisation + " " + (themeOf(e.theme)?.label || "")).toLowerCase().includes(query))
      .slice()
      .sort((a, b) => {
        const da = parseFrenchDate(a.dateEvenement), db = parseFrenchDate(b.dateEvenement);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      });

    if (events.length === 0) {
      wrap.innerHTML = `<div class="empty-state">Aucun événement. Cliquez sur « + Nouvel événement » pour commencer.</div>`;
      return;
    }

    wrap.innerHTML = events.map((ev) => {
      const theme = themeOf(ev.theme);
      const upcoming = isUpcoming(ev);
      return `
        <div class="event-row" data-id="${escapeHtml(ev.id)}">
          <span class="badge-dot" style="background:${theme.couleur}"></span>
          <div class="info">
            <div class="t">${escapeHtml(ev.titre)}</div>
            <div class="m">${escapeHtml(ev.localisation || "—")} · ${escapeHtml(ev.dateEvenement)}</div>
          </div>
          <span class="status-pill ${upcoming ? "status-a_venir" : "status-termine"}">${upcoming ? "À venir" : "Terminé"}</span>
          <div class="actions">
            <button class="btn btn-outline btn-small act-edit" data-id="${escapeHtml(ev.id)}">Modifier</button>
            <button class="btn btn-outline btn-small act-dup" data-id="${escapeHtml(ev.id)}">Dupliquer</button>
            <button class="btn btn-danger btn-small act-del" data-id="${escapeHtml(ev.id)}">Supprimer</button>
          </div>
        </div>`;
    }).join("");

    wrap.querySelectorAll(".act-edit").forEach((b) => b.addEventListener("click", () => openForm(b.dataset.id)));
    wrap.querySelectorAll(".act-dup").forEach((b) => b.addEventListener("click", () => duplicateEvent(b.dataset.id)));
    wrap.querySelectorAll(".act-del").forEach((b) => b.addEventListener("click", () => deleteEvent(b.dataset.id)));
  }

  document.getElementById("event-search").addEventListener("input", renderEventList);

  function duplicateEvent(id) {
    const ev = state.events.find((e) => e.id === id);
    if (!ev) return;
    const clone = JSON.parse(JSON.stringify(ev));
    clone.id = uniqueId(ev.id + "-copie");
    clone.titre = ev.titre + " (copie)";
    state.events.push(clone);
    renderEventList(); saveDraft();
    toast("Événement dupliqué");
  }

  function deleteEvent(id) {
    const ev = state.events.find((e) => e.id === id);
    if (!ev) return;
    if (!confirm(`Supprimer l'événement « ${ev.titre} » ?`)) return;
    state.events = state.events.filter((e) => e.id !== id);
    renderEventList(); saveDraft();
    toast("Événement supprimé");
  }

  function uniqueId(base) {
    let id = base, n = 1;
    while (state.events.some((e) => e.id === id)) { id = base + "-" + (++n); }
    return id;
  }

  /* ---------------------------------------------------------------
     Formulaire (ajout / modification)
  --------------------------------------------------------------- */
  const modal = document.getElementById("event-modal");
  const form = document.getElementById("event-form");

  function fillThemeSelect() {
    const sel = document.getElementById("ev-theme");
    sel.innerHTML = `<option value="">— Aucune (thème par défaut) —</option>` +
      state.themes.map((t) => `<option value="${escapeHtml(t.id)}">${t.icone} ${escapeHtml(t.label)}</option>`).join("");
  }

  function openForm(id) {
    fillThemeSelect();
    form.reset();
    clearInvalid();
    const editing = id ? state.events.find((e) => e.id === id) : null;
    document.getElementById("modal-title-text").textContent = editing ? "Modifier l'événement" : "Nouvel événement";
    document.getElementById("ev-editing-id").value = editing ? editing.id : "";

    const f = (fieldId, value) => { document.getElementById(fieldId).value = value ?? ""; };
    f("ev-titre", editing?.titre);
    f("ev-theme", editing?.theme || "");
    f("ev-statut", editing?.statut || "Terminé");
    f("ev-dateEvenement", editing?.dateEvenement);
    f("ev-date-helper", "");
    f("ev-horaireGen", editing?.horaireGen);
    f("ev-horaireConf", editing?.horaireConf);
    f("ev-horaireCocktail", editing?.horaireCocktail);
    f("ev-localisation", editing?.localisation);
    f("ev-lieu", editing?.lieu);
    f("ev-adresse", editing?.adresse);
    f("ev-cp", editing?.cp);
    f("ev-intervenant", editing?.intervenant);
    f("ev-nombreInscrit", editing?.nombreInscrit ?? 0);
    f("ev-nombrePlaceMax", editing?.nombrePlaceMax ?? 0);
    f("ev-description", editing?.description);
    f("ev-detailEvenement", editing?.detailEvenement);
    f("ev-communes", (editing?.communesConcernees || "").split("_").map((s) => s.trim()).filter(Boolean).join(", "));
    f("ev-codeCaisse", editing?.codeCaisse);
    f("ev-libelleCaisse", editing?.libelleCaisse);
    f("ev-dateEnvoiEmail", editing?.dateEnvoiEmail);
    f("ev-dateEnvoiSmsJ15", editing?.dateEnvoiSmsJ15);
    f("ev-dateEnvoiSmsJ2", editing?.dateEnvoiSmsJ2);
    f("ev-image", editing?.image);
    updateEvImagePreview();

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  /** Met à jour la miniature d'aperçu : image propre à l'événement, sinon image de la thématique choisie. */
  function updateEvImagePreview() {
    const customUrl = document.getElementById("ev-image").value.trim();
    const theme = themeOf(document.getElementById("ev-theme").value);
    const src = customUrl || theme?.image;
    const thumb = document.getElementById("ev-image-preview");
    const label = document.getElementById("ev-image-preview-label");
    if (src) {
      thumb.innerHTML = `<img src="${src}" alt="">`;
    } else {
      thumb.textContent = theme?.icone || "🖼️";
    }
    label.innerHTML = customUrl
      ? "<strong>Image spécifique</strong> à cet événement."
      : `Aucune photo propre à l'événement : l'image par défaut de la thématique <strong>${escapeHtml(theme?.label || "")}</strong> sera utilisée.`;
  }
  document.getElementById("ev-image").addEventListener("input", updateEvImagePreview);
  document.getElementById("ev-theme").addEventListener("change", updateEvImagePreview);
  document.getElementById("btn-clear-ev-image").addEventListener("click", () => {
    document.getElementById("ev-image").value = "";
    updateEvImagePreview();
  });
  document.getElementById("btn-upload-ev-image").addEventListener("click", () => document.getElementById("file-ev-image").click());
  document.getElementById("file-ev-image").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await fileToOptimizedDataUrl(file, 1000);
      document.getElementById("ev-image").value = dataUrl;
      updateEvImagePreview();
      toast("Photo ajoutée");
    } catch (err) {
      toast("Impossible de lire cette image");
    }
    e.target.value = "";
  });

  function closeForm() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.getElementById("btn-add-event").addEventListener("click", () => openForm(null));
  document.getElementById("modal-cancel").addEventListener("click", closeForm);
  document.getElementById("btn-cancel-form").addEventListener("click", closeForm);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeForm(); });

  document.getElementById("btn-gen-date").addEventListener("click", () => {
    const iso = document.getElementById("ev-date-helper").value;
    if (!iso) { toast("Choisissez d'abord une date avec le sélecteur"); return; }
    const d = new Date(iso + "T00:00:00");
    const label = `${capitalize(JOURS_FR[d.getDay()])} ${d.getDate()} ${MOIS_FR_ACCENT[d.getMonth()]} ${d.getFullYear()}`;
    document.getElementById("ev-dateEvenement").value = label;
  });
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function clearInvalid() {
    document.querySelectorAll(".field.invalid").forEach((f) => f.classList.remove("invalid"));
  }

  document.getElementById("btn-save-event").addEventListener("click", () => {
    clearInvalid();
    const val = (id) => document.getElementById(id).value.trim();
    const titre = val("ev-titre");
    const dateEvenement = val("ev-dateEvenement");
    const localisation = val("ev-localisation");

    let hasError = false;
    if (!titre) { document.getElementById("field-titre").classList.add("invalid"); hasError = true; }
    if (!dateEvenement) { hasError = true; toast("La date de l'événement est obligatoire"); }
    if (!localisation) { document.getElementById("field-localisation").classList.add("invalid"); hasError = true; }
    if (hasError) { if (!dateEvenement) return; toast("Merci de compléter les champs obligatoires (*)"); return; }

    const editingId = document.getElementById("ev-editing-id").value;
    const communes = val("ev-communes").split(",").map((s) => s.trim()).filter(Boolean).join("_");

    const data = {
      id: editingId || uniqueId(slugify(titre)),
      dateEvenement,
      titre,
      localisation,
      theme: document.getElementById("ev-theme").value,
      statut: val("ev-statut") || "Terminé",
      intervenant: val("ev-intervenant"),
      horaireGen: val("ev-horaireGen"),
      horaireCocktail: val("ev-horaireCocktail"),
      horaireConf: val("ev-horaireConf"),
      lieu: val("ev-lieu"),
      adresse: val("ev-adresse"),
      cp: val("ev-cp"),
      nombreInscrit: Number(val("ev-nombreInscrit")) || 0,
      nombrePlaceMax: Number(val("ev-nombrePlaceMax")) || 0,
      description: val("ev-description"),
      communesConcernees: communes,
      detailEvenement: val("ev-detailEvenement"),
      codeCaisse: val("ev-codeCaisse"),
      libelleCaisse: val("ev-libelleCaisse"),
      dateEnvoiEmail: val("ev-dateEnvoiEmail"),
      dateEnvoiSmsJ15: val("ev-dateEnvoiSmsJ15"),
      dateEnvoiSmsJ2: val("ev-dateEnvoiSmsJ2"),
      image: val("ev-image")
    };

    if (editingId) {
      const idx = state.events.findIndex((e) => e.id === editingId);
      state.events[idx] = data;
    } else {
      state.events.push(data);
    }

    closeForm();
    renderEventList();
    saveDraft();
    toast(editingId ? "Événement mis à jour" : "Événement ajouté");
  });

  function slugify(str) {
    return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 30) || "evenement";
  }

  /* ---------------------------------------------------------------
     Onglet Chiffres clés
  --------------------------------------------------------------- */
  const STAT_FIELDS = [
    { key: "totalEvenements", label: "Nombre d'événements", compute: () => state.events.length },
    { key: "totalParticipants", label: "Nombre de participants", compute: () => state.events.reduce((s, e) => s + (Number(e.nombreInscrit) || 0), 0) },
    { key: "totalIntervenants", label: "Nombre d'intervenants", compute: () => new Set(state.events.map((e) => e.intervenant).filter(Boolean)).size },
    { key: "totalThemes", label: "Nombre de thèmes abordés", compute: () => new Set(state.events.map((e) => e.theme).filter(Boolean)).size }
  ];

  function renderStatsTab() {
    const wrap = document.getElementById("stats-rows");
    wrap.innerHTML = STAT_FIELDS.map((f) => {
      const auto = state.statsAuto[f.key];
      const computed = f.compute();
      const value = auto ? computed : (state.stats[f.key] ?? computed);
      return `
        <div class="stat-row">
          <label>${f.label}</label>
          <input type="number" id="stat-${f.key}" value="${value}" ${auto ? "disabled" : ""}>
          <label class="auto-check"><input type="checkbox" id="auto-${f.key}" ${auto ? "checked" : ""}> Auto (calculé)</label>
          <span class="computed">valeur calculée : ${computed}</span>
        </div>`;
    }).join("");

    STAT_FIELDS.forEach((f) => {
      document.getElementById(`auto-${f.key}`).addEventListener("change", (e) => {
        state.statsAuto[f.key] = e.target.checked;
        renderStatsTab(); saveDraft();
      });
      document.getElementById(`stat-${f.key}`).addEventListener("input", (e) => {
        state.stats[f.key] = Number(e.target.value) || 0;
        saveDraft();
      });
    });
  }

  /* ---------------------------------------------------------------
     Onglet Thématiques
  --------------------------------------------------------------- */
  let themeImageEditingIndex = null;

  function renderThemesTab() {
    const body = document.getElementById("themes-body");
    body.innerHTML = state.themes.map((t, i) => `
      <tr data-i="${i}">
        <td>
          <div class="image-cell">
            <div class="thumb">${t.image ? `<img src="${escapeHtml(t.image)}" alt="">` : escapeHtml(t.icone)}</div>
            <div class="image-actions">
              <button type="button" class="btn btn-outline btn-small th-upload">📁 Choisir</button>
              <button type="button" class="btn btn-outline btn-small th-url">🔗 URL</button>
              ${t.image ? `<button type="button" class="btn btn-danger btn-small th-clear-img">✕ Retirer</button>` : ""}
            </div>
          </div>
        </td>
        <td><input type="text" class="th-id" value="${escapeHtml(t.id)}"></td>
        <td><input type="text" class="th-label" value="${escapeHtml(t.label)}"></td>
        <td><input type="text" class="th-icon" value="${escapeHtml(t.icone)}" style="width:52px;text-align:center"></td>
        <td><input type="color" class="th-color" value="${toHexColor(t.couleur)}"></td>
        <td><button class="btn btn-danger btn-small th-del">✕</button></td>
      </tr>`).join("");

    body.querySelectorAll("tr").forEach((tr) => {
      const i = Number(tr.dataset.i);
      tr.querySelector(".th-id").addEventListener("input", (e) => { state.themes[i].id = e.target.value.trim(); saveDraft(); });
      tr.querySelector(".th-label").addEventListener("input", (e) => { state.themes[i].label = e.target.value; saveDraft(); renderEventList(); });
      tr.querySelector(".th-icon").addEventListener("input", (e) => { state.themes[i].icone = e.target.value; saveDraft(); renderThemesTab(); });
      tr.querySelector(".th-color").addEventListener("input", (e) => { state.themes[i].couleur = e.target.value; saveDraft(); renderEventList(); });
      tr.querySelector(".th-del").addEventListener("click", () => {
        if (!confirm("Supprimer cette thématique ?")) return;
        state.themes.splice(i, 1);
        renderThemesTab(); saveDraft();
      });
      tr.querySelector(".th-upload").addEventListener("click", () => {
        themeImageEditingIndex = i;
        document.getElementById("file-theme-image").click();
      });
      tr.querySelector(".th-url").addEventListener("click", () => {
        const url = prompt("URL (ou chemin, ex: images/mon-theme.jpg) de l'image par défaut :", state.themes[i].image || "");
        if (url === null) return;
        state.themes[i].image = url.trim();
        renderThemesTab(); saveDraft();
      });
      const clearBtn = tr.querySelector(".th-clear-img");
      if (clearBtn) clearBtn.addEventListener("click", () => {
        state.themes[i].image = "";
        renderThemesTab(); saveDraft();
      });
    });
  }

  document.getElementById("file-theme-image").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || themeImageEditingIndex === null) return;
    try {
      const dataUrl = await fileToOptimizedDataUrl(file, 1000);
      state.themes[themeImageEditingIndex].image = dataUrl;
      renderThemesTab(); saveDraft();
      toast("Image de la thématique mise à jour");
    } catch (err) {
      toast("Impossible de lire cette image");
    }
    e.target.value = "";
    themeImageEditingIndex = null;
  });
  function toHexColor(c) {
    if (/^#([0-9a-f]{3}){1,2}$/i.test(c)) return c.length === 4 ? "#" + [...c.slice(1)].map((x) => x + x).join("") : c;
    return "#003D2B";
  }

  document.getElementById("btn-add-theme").addEventListener("click", () => {
    state.themes.push({ id: "nouveau-theme", label: "Nouveau thème", icone: "⭐", couleur: "#003D2B", image: "" });
    renderThemesTab(); saveDraft();
  });

  /* ---------------------------------------------------------------
     Export / téléchargement / copie / import
  --------------------------------------------------------------- */
  function currentXml() { return buildEvenementsXML(state.events); }

  function currentStatsOut() {
    const statsOut = {};
    STAT_FIELDS.forEach((f) => { statsOut[f.key] = state.statsAuto[f.key] ? null : (state.stats[f.key] ?? f.compute()); });
    return statsOut;
  }

  function renderExportPreview() {
    document.getElementById("code-preview").textContent = currentXml();
  }

  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById("btn-download").addEventListener("click", () => {
    downloadBlob(currentXml(), "RDVCitoyens.xml", "application/xml");
    toast("Fichier RDVCitoyens.xml téléchargé");
  });

  document.getElementById("btn-download-js").addEventListener("click", () => {
    downloadBlob(buildEventsDataJs(currentXml(), state.themes, currentStatsOut()), "events-data.js", "text/javascript");
    toast("Fichier events-data.js téléchargé — remplacez les DEUX fichiers dans data/");
  });

  /** Enveloppe le XML courant dans le bloc à coller tel quel dans le
   *  second composant COLI d'une page AEM (voir aem/coli-2-donnees-xml.html). */
  function buildColi2Block(xmlText) {
    return `<script type="application/xml" id="rdv-citoyens-xml-data">\n${xmlText}\n<\/script>`;
  }

  document.getElementById("btn-copy-coli2").addEventListener("click", async () => {
    const text = buildColi2Block(currentXml());
    try {
      await navigator.clipboard.writeText(text);
      toast("Bloc AEM copié — collez-le dans le composant COLI n°2");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Bloc AEM copié — collez-le dans le composant COLI n°2"); }
      catch (e2) { toast("Impossible de copier automatiquement — utilisez l'aperçu"); }
      ta.remove();
    }
  });

  document.getElementById("btn-copy").addEventListener("click", async () => {
    const text = currentXml();
    try {
      await navigator.clipboard.writeText(text);
      toast("XML copié dans le presse-papiers");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("XML copié dans le presse-papiers"); }
      catch (e2) { toast("Impossible de copier automatiquement — utilisez l'aperçu"); }
      ta.remove();
    }
  });

  document.getElementById("btn-import").addEventListener("click", () => document.getElementById("file-import").click());
  document.getElementById("file-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const events = parseEvenementsXML(String(reader.result));
        state.events = events;
        renderAll(); saveDraft();
        toast("Import réussi : " + state.events.length + " événement(s)");
      } catch (err) {
        alert("Fichier XML invalide : " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  /* ---------------------------------------------------------------
     Brouillon (localStorage)
  --------------------------------------------------------------- */
  function tryLoadDraft() {
    let raw;
    try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) { return; }
    if (!raw) return;
    document.getElementById("import-banner").style.display = "flex";
    document.getElementById("restore-draft").addEventListener("click", () => {
      try {
        const draft = JSON.parse(raw);
        state = Object.assign(state, draft);
        renderAll();
        toast("Brouillon restauré");
      } catch (e) { toast("Le brouillon est corrompu"); }
      document.getElementById("import-banner").style.display = "none";
    });
    document.getElementById("discard-draft").addEventListener("click", () => {
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      document.getElementById("import-banner").style.display = "none";
    });
  }

  function renderAll() {
    renderEventList();
    renderStatsTab();
    renderThemesTab();
    renderExportPreview();
  }

  renderAll();
  tryLoadDraft();
})();
