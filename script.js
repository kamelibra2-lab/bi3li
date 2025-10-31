  // Variables Formulaire ------------------------------------------------------
  
  const AppScripAvis = "https://script.google.com/macros/s/AKfycbyhUhdUPHpBHnCAw-y9AjomlZ7Ps07sf2h91QhU2oW4xNGDaRNgw1tI0jhYIbNWIpfwEw/exec";
  const AppScripCommande = "https://script.google.com/macros/s/AKfycbxER33Xe4czgtE3lXhUFf7n82dXKO3uTWKMHAumSWtUFgpnQhUDV6M6ax44rkk3BEHI/exec";  
  const params = new URLSearchParams(window.location.search);
  const codeArticle = params.get("code"); 
  let fraisLivraison = 0;
  let ancienprixUnitaire = 0;  
  let prixUnitaire = 0;
  let modeLivraison = "domicile";
  let selectedOption = null;
  let communesData = [];
  let desksData = [];
  
  // ---------------------------------------------------------------------------
  
  //Elements HTML du formulaire ------------------------------------------------
  const articleTextAr = document.getElementById("articleNomAR");
  const articleTextFr = document.getElementById("articleNomFR");
  const articleDescFr = document.getElementById("articleDescFR");
  const articleDescAr = document.getElementById("articleDescAR");
  const qttInput = document.querySelector('input[name="qtt"]');
  const totalBrutInput = document.querySelector('input[name="total_brut"]');
  const remiseInput = document.querySelector('input[name="remise"]');
  const totalInput = document.querySelector('input[name="total"]');
  const totalRemiseContainer = document.getElementById("totalRemiseContainer");
  const submitBtn = document.getElementById("submitBtn");
  const articlePrice = document.getElementById("articlePrice");
  const oldarticlePrice = document.getElementById("oldarticlePrice");
  const totalPrice = document.getElementById("totalPrice"); 
  const livraison = document.querySelector('input[name="livraison"]');
  const deskContainer = document.getElementById("deskContainer");
  const totalPriceBox = document.getElementById("totalPriceBox");
  //----------------------------------------------------------------------------  
  
  //Ajouter Des evenements------------------------------------------------------
  let Articles = {};
  document.addEventListener("DOMContentLoaded", async () => 
     {
      chargerPhotos(codeArticle);
      await chargerCatalogue();      
      await chargerWilayas();
      await chargerCommunes();
      await chargerDesks();
      initialiserFormulaire();
      chargerVideo(codeArticle);      
      chargerAvis();
    }
  );

  document.getElementById("plusBtn").addEventListener("click", () => 
      {
        qttInput.value = parseInt(qttInput.value) + 1;
        calculer();
      }
  );

  document.getElementById("minusBtn").addEventListener("click", () => 
      {
        let val = parseInt(qttInput.value);
        if (val > 1) 
        {
          qttInput.value = val - 1;
          calculer();
        }
      }
  );
  
  document.getElementById("myForm").addEventListener("submit", function (e) 
  {
      e.preventDefault();
      this.classList.add("hidden");
      document.getElementById("loading").classList.remove("hidden");
    
      const formData = Object.fromEntries(new FormData(this));
      formData.article = codeArticle;
      formData.date = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Algiers" });
      formData.modeLivraison = modeLivraison;
    
      if (modeLivraison === "desk") 
      {
        const deskRadio = document.querySelector('input[name="desk"]:checked');
        formData.nomDesk = deskRadio ? deskRadio.value : "";
      } 
      else 
      {
        formData.nomDesk = "";
      }
    
      if (!Verif_Phone(formData.tel)) 
      {
        alert("❌ Numéro de téléphone invalide. Exemple : 0550123456 ou 021123456");
        this.classList.remove("hidden");
        document.getElementById("loading").classList.add("hidden");
        return;
      }
    
      fetch(AppScripCommande, {
                                  method: "POST",
                                  body: JSON.stringify(formData)
                               })
      .then(res => res.text())
      .then(txt => {
                    document.getElementById("loading").classList.add("hidden");
                    if (txt.trim() === "OK") 
                    {
                      
                        formData.articleNomFR = Articles[codeArticle]?.nom_fr || "Article inconnu";
                        formData.articleNomAR = Articles[codeArticle]?.nom_ar || "Article inconnu";
                        formData.articleDescFR = Articles[codeArticle]?.description_fr || "";
                        formData.articleDescAR = Articles[codeArticle]?.description_ar || "";
                      
                        formData.prixTotal = totalInput.value || "0 DA";
                        formData.wilayaNom = document.querySelector("#wilaya option:checked").textContent;
                        // Ajouter les infos de l'article au formulaire avant de sauvegarder
                        const commandeData = 
                        {
                          formData,
                          nomFR: Articles[codeArticle]?.nom_fr || "Article inconnu",
                          nomAR: Articles[codeArticle]?.nom_ar || "Article inconnu",
                          descriptionFR: Articles[codeArticle]?.description_fr || "",
                          descriptionAR: Articles[codeArticle]?.description_ar || ""
                        };
            
                        // Sauvegarder dans le localStorage
                        localStorage.setItem("commandeData", JSON.stringify(commandeData));
                        
                        // Redirection vers la page de confirmation
                        window.location.href = "confirmation.html";
                        }
                        else
                        {
                          alert("Erreur : " + txt);
                          this.classList.remove("hidden");
                        }
                  }
            ).catch(err => {
                            alert("Erreur réseau : " + err);
                            this.classList.remove("hidden");
                            document.getElementById("loading").classList.add("hidden");
                           }
                    );
    });

  
    document.querySelectorAll('input[name="modeLivraison"]').forEach(radio => 
    {
      radio.addEventListener("change", (e) => {
        modeLivraison = e.target.value;
        console.log("Mode de livraison :", modeLivraison);
    
        // 🔹 Recalcule le bon montant avant calcul total
        fraisLivraison = Calculer_Livraison(modeLivraison);
        livraison.value = formatDA(fraisLivraison);
    
        calculer(); // 🔹 maintenant la valeur est juste
      });
    });

  //---------------------------------------------------------------------------- 
 
  // Lancer l'initialisation du formulaire ------------------------------------- 
    function initialiserFormulaire() 
    {
      console.log("Formulaire prêt. Catalogue disponible :", Articles);
      
      if (codeArticle && Articles[codeArticle]) 
      {
        articleTextAr.textContent = Articles[codeArticle].nom_ar || "";
        articleTextFr.textContent = Articles[codeArticle].nom_fr || "";
        articleDescFr.textContent = Articles[codeArticle].description_fr || "";
        articleDescAr.textContent = Articles[codeArticle].description_ar || "";
        
        
        prixUnitaire = Articles[codeArticle].prix;
        articlePrice.textContent = formatDA(prixUnitaire);	
    	
    	ancienprixUnitaire = Articles[codeArticle].ancien_prix;
    	oldarticlePrice.textContent = ancienprixUnitaire > 0 ? formatDA(ancienprixUnitaire) : "";
    
    	livraison.value = formatDA(fraisLivraison);
    	
    	calculer();
      }
      else 
      {
        articleText.textContent = "Code article invalide";
        qttInput.disabled = true;
        submitBtn.disabled = true;
      }
    }
  //----------------------------------------------------------------------------
  
  // Chargement des articles depuis Articles.json ------------------------------ 
    async function chargerCatalogue() 
    {
      try {
        console.log("Tentative de chargement du catalogue depuis Articles.json...");
        const response = await fetch("Articles.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Erreur réseau (${response.status})`);
        Articles = await response.json();
        console.log("Catalogue chargé avec succès :", Articles);
      } catch (err) {
        console.error("Erreur lors du chargement du fichier Articles.json :", err);
      }
    }
  //----------------------------------------------------------------------------

  // Chargement des Wilayas depuis Wilayas.json--------------------------------- 
    async function chargerWilayas() 
    {
      try {
        const response = await fetch("Wilayas.json");
        if (!response.ok) throw new Error("Impossible de charger Wilayas.json");
    
        const wilayas = await response.json();
        const wilayasActives = wilayas.filter(w => w.active === 1);
    
        const selectWilaya = document.getElementById("wilaya");
        selectWilaya.innerHTML = '<option value="">Sélectionnez votre wilaya / إختر الولاية</option>';
    
        // ✅ Ajouter les options dans la liste
        wilayasActives.forEach(w => {
          const opt = document.createElement("option");
          opt.value = w.num;
          opt.textContent = `${w.num.toString().padStart(2, "0")} - ${w.fr} (${w.ar})`;
          opt.dataset.domicile = w.domicile;
          opt.dataset.desk = w.desk;
          selectWilaya.appendChild(opt);
        });
    
        // ✅ Ajouter un seul écouteur de changement
        selectWilaya.addEventListener("change", (e) => 
        {
          selectedOption = e.target.selectedOptions[0];
        
          // 🔹 Met à jour le select commune
          const wilayaNum = e.target.value;
          const communeSelect = document.createElement("select");
          communeSelect.name = "commune";
          communeSelect.required = true;
          communeSelect.innerHTML = '<option value="">Sélectionnez votre commune / إختر البلدية</option>';
        
          const communes = communesData.find(w => w.Wilaya === wilayaNum)?.communes || [];
          communes.forEach(c => 
          {
            const opt = document.createElement("option");
            opt.value = c.fr;
            opt.textContent = `${c.fr} (${c.ar})`;
            communeSelect.appendChild(opt);
          });
        
          const oldSelect = document.querySelector('select[name="commune"]');
            if (oldSelect)
            {
                oldSelect.replaceWith(communeSelect);
            } else 
            {
                const form = document.getElementById("myForm");
                form.appendChild(communeSelect);
            }
        
          majPrixLivraisonLabels();
          fraisLivraison = Calculer_Livraison(modeLivraison);
          livraison.value = formatDA(fraisLivraison);
          calculer();
          afficherDesks();
          normalizeSelects();
        });

    
        console.log("✅ Wilayas chargées :", wilayasActives.length);
      } catch (error) {
        console.error("Erreur lors du chargement des wilayas :", error);
      }
    }

  //----------------------------------------------------------------------------
  
  //Charger la liste des communes ----------------------------------------------
    async function chargerCommunes() {
      try {
        const response = await fetch("Communes.json");
        if (!response.ok) throw new Error("Impossible de charger Communes.json");
    
        communesData = await response.json();

        // ✅ Vérification + tri sécurisé pour chaque wilaya
        communesData.forEach(wilaya => 
        {
          if (Array.isArray(wilaya.communes)) 
          {
            wilaya.communes.sort((a, b) => (a.fr || "").localeCompare(b.fr || "", "fr", { sensitivity: "base" }));
          } 
          else 
          {
            console.warn(`⚠️ Aucune commune trouvée pour la wilaya ${wilaya.Wilaya}`);
          }
        });
    
        console.log("✅ Communes chargées avec succès :", communesData.length);
      } 
      catch (err) 
      {
        console.error("Erreur lors du chargement des communes :", err);
      }
      normalizeSelects();
    }

  //----------------------------------------------------------------------------
  
  //Charger la liste des Desks -------------------------------------------------
  async function chargerDesks() 
  {
      try 
      {
        const response = await fetch("Desks.json");
        if (!response.ok) throw new Error("Impossible de charger Desks.json");
        desksData = await response.json();
        console.log("✅ Desks chargés :", desksData.length);
      }
      catch (err) 
      {
        console.error("Erreur lors du chargement des desks :", err);
      }
  }
  //----------------------------------------------------------------------------
  
    function afficherDesks() 
    {
      deskContainer.innerHTML = "";
      if (modeLivraison !== "desk" || !selectedOption) return;
    
      const wilayaNum = selectedOption.value;
      const desksWilaya = desksData.filter(d => d.Wilaya === wilayaNum);
    
      if (desksWilaya.length === 0) {
        deskContainer.textContent = "Aucun desk disponible pour cette wilaya.";
        return;
      }
    
      desksWilaya.forEach((desk, i) => {
        const label = document.createElement("label");
        label.className = "livraison-option"; // ✅ même style que les radios principales
    
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "desk";
        input.value = desk.desk;
        if (i === 0) input.checked = true;
    
        const span = document.createElement("span");
        span.textContent = desk.desk;
    
        label.appendChild(input);
        label.appendChild(span);
        deskContainer.appendChild(label);
      });
    }

    
    // Rafraîchit les desks si mode ou wilaya changent
    document.querySelectorAll('input[name="modeLivraison"]').forEach(radio => {
      radio.addEventListener("change", afficherDesks);
    });
    document.getElementById("wilaya").addEventListener("change", afficherDesks);
      
      
      
      
      // 🔹 Met à jour les montants à côté des labels
    function majPrixLivraisonLabels() {
      const domicileSpan = document.getElementById("prixDomicile");
      const deskSpan = document.getElementById("prixDesk");
      if (!selectedOption) {
        domicileSpan.textContent = "--";
        deskSpan.textContent = "--";
        return;
      }
      domicileSpan.textContent = `${selectedOption.dataset.domicile} DA`;
      deskSpan.textContent = `${selectedOption.dataset.desk} DA`;
    }
  
  // Calcul les montants -------------------------------------------------------
  function calculer() 
  {
    const qtt = parseInt(qttInput.value) ;
    let remise = Calculer_Remise(qtt);
    console.log(remise);
    
    const total_brut = qtt * prixUnitaire;
    const total = total_brut - remise + fraisLivraison ;

    remiseInput.value = formatDA(remise);
    totalBrutInput.value = formatDA(total_brut);
    totalInput.value = formatDA(total);
	
    if (remise > 0) {
      totalRemiseContainer.classList.remove("hidden"); 
    } else {
      totalRemiseContainer.classList.add("hidden");
    }
	
	// affiche le Total en bas au dessus du Bouton
	totalPriceBox.innerHTML = total > 0 
    ? `<div class="fr">Montant à payer</div>
       <div class="price">${formatDA(total)}</div>
       <div class="ar">المبلغ النهائي للدفع</div>`
       : "";
       
    submitBtn.disabled = !(qtt >= 1 && prixUnitaire > 0);
  }
  //----------------------------------------------------------------------------
  
    function Calculer_Livraison(mode) 
    {
      const domicile =  selectedOption ? Number(selectedOption.dataset.domicile) : 0;
      const desk =  selectedOption ? Number(selectedOption.dataset.desk) : 0;
    
      switch (mode) {
        case 'domicile':
          return domicile;
        case 'desk':
          return desk;
        default:
          return 0;
      }
    }
  
  // Calculer frais de livraison selon la Quantité -----------------------------
    function Calculer_Remise(Qtt) 
    {
      const art = Articles[codeArticle];
      if (!art) return 0;
    
      switch (Qtt) {
        case 1:
          return 0;
        case 2:
          return art.remise_x2;
        case 3:
          return art.remise_x3;
        default:
          return art.remise_x4;
      }
    }
  // ---------------------------------------------------------------------------  
  
  //Formatage des Montants -----------------------------------------------------
  function formatDA(montant) 
  {
	  return new Intl.NumberFormat("fr-DZ", { 
		style: "currency", 
		currency: "DZD", 
		minimumFractionDigits: 0 
	  }).format(montant);
  }
  //----------------------------------------------------------------------------
  
  //Verification numero telephonne ---------------------------------------------
    function Verif_Phone(tel) 
    {
      if (!tel) return false;
      
      // Supprimer espaces, tirets, parenthèses
      tel = String(tel).trim().replace(/[\s\-\(\)]/g, "");
      
      // Gérer le format international +213
      if (tel.startsWith("+213")) {
        tel = "0" + tel.slice(4);
      }
    
      // Vérification du format mobile (05,06,07) ou fixe (02,03,04)
      const regex = /^(0(5|6|7)\d{8}|0(2|3|4)\d{7})$/;
      return regex.test(tel);
    }
  //----------------------------------------------------------------------------

    
    
  // Gestion des avis existants ------------------------------------------------
    
    
    function chargerAvis() {
      const container = document.getElementById("avisListe");
      container.style.background = "#f5f5f5";
      container.style.padding = "10px";
      container.style.borderRadius = "10px";
    
      // 🔹 Crée et affiche le spinner
      const spinner = document.createElement("div");
      spinner.id = "spinner";
      spinner.innerHTML = `<div class="spinner-circle"></div>`;
      container.appendChild(spinner);
    
      fetch(`${AppScripAvis}?article=${encodeURIComponent(codeArticle)}`)
        .then(res => res.json())
        .then(data => {
          spinner.remove(); // 🔹 Retire le spinner une fois les données reçues
    
          if (!Array.isArray(data)) {
            container.textContent = "Format inattendu des avis";
            return;
          }
    
          if (data.length === 0) {
            container.textContent = "Aucun avis pour cet article.";
            return;
          }
    
          data.reverse();
    
          container.innerHTML = data.map(a => {
            const etoilesHTML = Array.from({ length: 5 }, (_, i) =>
              `<i class="fa fa-star" style="color:${i < a.note ? '#f8c700' : '#ddd'}; margin-right:2px;"></i>`
            ).join("");
    
            const initials = a.nom
              .split(' ')
              .filter(n => n.trim().length > 0)
              .map(n => n[0].toUpperCase())
              .slice(0, 2)
              .join('');
    
            const bgColor = getColorFromName(a.nom);
    
            return `
              <div class="avis-item" style="
                display:flex;
                align-items:flex-start;
                gap:10px;
                background:white;
                border-radius:8px;
                padding:10px;
                margin-bottom:10px;
                box-shadow:0 1px 3px rgba(0,0,0,0.08);
              ">
                <div class="avatar"
                     style="
                       width:42px;
                       height:42px;
                       border-radius:50%;
                       background:${bgColor};
                       color:white;
                       font-weight:bold;
                       display:flex;
                       align-items:center;
                       justify-content:center;
                       font-size:15px;
                       flex-shrink:0;
                     ">
                  ${initials}
                </div>
                <div class="avis-contenu" style="flex:1;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                    <strong>${a.nom}</strong>
                    <div class="etoiles">${etoilesHTML}</div>
                  </div>
                  <small style="color:#777;">${a.date}</small><br>
                  <em style="color:#333;">${a.commentaire}</em>
                </div>
              </div>
            `;
          }).join("");
        })
        .catch(err => {
          spinner.remove();
          container.textContent = "Erreur de chargement des avis : " + err.message;
        });
    }
    
    // Génère les initiales (max 2 lettres)
    function getInitials(fullName) {
      if (!fullName) return "";
      const words = fullName.trim().split(/\s+/);
      return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
    }
    
    // Génère une couleur pastel aléatoire
    function getRandomColor() {
      const hue = Math.floor(Math.random() * 360);
      const pastel = `hsl(${hue}, 70%, 80%)`;
      return pastel;
    }
    
    function getColorFromName(nom) {
      const hash = [...nom].reduce((a, c) => a + c.charCodeAt(0), 0);
      return `hsl(${hash % 360}, 70%, 70%)`;
    }
    
    let noteEtoiles = 0;
    
    // Gestion des étoiles
    document.querySelectorAll("#etoiles .fa-star").forEach(star => {
      star.style.cursor = "pointer";
      star.addEventListener("click", () => {
        noteEtoiles = parseInt(star.dataset.value);
        document.querySelectorAll("#etoiles .fa-star").forEach(s =>
          s.style.color = s.dataset.value <= noteEtoiles ? "#f8c700" : "#ccc"
        );
      });
    });
    
    // Soumission du formulaire
    document.getElementById("avisForm").addEventListener("submit", e => {
      e.preventDefault();
    
      if (noteEtoiles === 0) {
        alert("Veuillez donner une note avant de publier votre avis.");
        return;
      }
    
      const form = document.getElementById("avisForm");
    
      // 🔹 Crée et affiche le spinner sur le formulaire
      const spinner = document.createElement("div");
      spinner.id = "spinner";
      spinner.innerHTML = `<div class="spinner-circle"></div>`;
      form.style.position = "relative";
      form.appendChild(spinner);
    
      const avisData = {
        avis: {
          article: codeArticle,
          nom: document.getElementById("avisNom").value.trim(),
          note: noteEtoiles,
          commentaire: document.getElementById("avisCommentaire").value.trim()
        }
      };
    
      fetch(AppScripAvis, {
        method: "POST",
        body: JSON.stringify(avisData)
      })
      .then(res => res.text())
      .then(txt => {
        spinner.remove();
    
        if (txt.includes("OK")) {
          form.reset();
          document.querySelectorAll("#etoiles .fa-star").forEach(s => s.style.color = "#ccc");
          noteEtoiles = 0;
          chargerAvis();
        } else {
          alert("Erreur lors de l’envoi : " + txt);
        }
      })
      .catch(err => {
        spinner.remove();
        alert("Erreur réseau : " + err.message);
      });
    });
  //----------------------------------------------------------------------------

  // Variables globales carrousel ----------------------------------------------
  let carrouselInterval;
  let carrouselPaused = false;
  let pleinEcranActif = false;
  let photos = [];
  let currentIndex = 0;
  //----------------------------------------------------------------------------
  
  //Gestion du Carrousel -------------------------------------------------------
  function lancerCarrousel() {
    clearInterval(carrouselInterval);
    carrouselInterval = setInterval(() => {
      let nextIndex = (currentIndex + 1) % photos.length;
      changerImage(nextIndex);
    }, 2000);
  }

  function changerImage(newIndex) {
    const mainPhoto = document.getElementById("mainPhoto");
    mainPhoto.classList.add("fade-out");
    setTimeout(() => {
      mainPhoto.src = photos[newIndex];
      mainPhoto.classList.remove("fade-out");
      document.querySelectorAll(".thumbnails img").forEach(el => el.classList.remove("active"));
      document.querySelectorAll(".thumbnails img")[newIndex].classList.add("active");
      currentIndex = newIndex;
    }, 500);
  }

  function activerInteractions(mainPhoto) 
  {
	const overlay = document.getElementById("fullscreenOverlay");
	const fullscreenImg = document.getElementById("fullscreenImage");
	const arrowLeft = document.getElementById("arrowLeft");
	const arrowRight = document.getElementById("arrowRight");

	mainPhoto.addEventListener("mouseenter", () => {
	  if (!carrouselPaused && !pleinEcranActif) {
		clearInterval(carrouselInterval);
		carrouselPaused = true;
	  }
	});

	mainPhoto.addEventListener("mouseleave", () => {
	  if (carrouselPaused && !pleinEcranActif) {
		carrouselPaused = false;
		lancerCarrousel();
	  }
	});

    mainPhoto.addEventListener("click", () => {
      fullscreenImg.style.opacity = 0;
      fullscreenImg.src = mainPhoto.src;
      overlay.style.display = "flex";
      setTimeout(() => {
        fullscreenImg.style.opacity = 1;
      }, 50);
      clearInterval(carrouselInterval);
      carrouselPaused = true;
      pleinEcranActif = true;
    });

    fullscreenImg.addEventListener("click", () => {
      fullscreenImg.classList.toggle("zoomed");
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.style.display = "none";
        fullscreenImg.classList.remove("zoomed");
        pleinEcranActif = false;
        carrouselPaused = false;
        lancerCarrousel();
      }
    });

    // Flèches navigation plein écran
    arrowLeft.addEventListener("click", (e) => {
      e.stopPropagation();
      changerImagePleinEcran((currentIndex - 1 + photos.length) % photos.length);
    });
    arrowRight.addEventListener("click", (e) => {
      e.stopPropagation();
      changerImagePleinEcran((currentIndex + 1) % photos.length);
    });

    // Navigation clavier dans le plein écran (optionnel, mais utile)
    overlay.addEventListener("keydown", (e) => {
      if (!pleinEcranActif) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        changerImagePleinEcran((currentIndex - 1 + photos.length) % photos.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        changerImagePleinEcran((currentIndex + 1) % photos.length);
      } else if (e.key === "Escape") {
        e.preventDefault();
        overlay.style.display = "none";
        fullscreenImg.classList.remove("zoomed");
        pleinEcranActif = false;
        carrouselPaused = false;
        lancerCarrousel();
      }
    });
  }
  
  // Animation transition dans le plein écran
  function changerImagePleinEcran(newIndex) {
    const fullscreenImg = document.getElementById("fullscreenImage");
    fullscreenImg.style.opacity = 0;
    setTimeout(() => {
      fullscreenImg.src = photos[newIndex];
      currentIndex = newIndex;
      updateThumbnailActive(currentIndex);
      fullscreenImg.style.opacity = 1;
    }, 500);
  }  
  
  // Met à jour la vignette active dans le carrousel classique
  function updateThumbnailActive(index) {
    document.querySelectorAll(".thumbnails img").forEach(el => el.classList.remove("active"));
    if (index >= 0 && index < photos.length) {
      document.querySelectorAll(".thumbnails img")[index].classList.add("active");
    }
  } 
  
  // Chargement des photos
	function chargerPhotos(articleID) {
	  const albumDiv = document.getElementById("photoAlbum");
	  const mainPhoto = document.getElementById("mainPhoto");
	  const thumbnails = document.getElementById("thumbnails");

	  let index = 0;
	  photos = [];
	  currentIndex = 0;
	  let firstDisplayed = false;
	  let erreursConsecutives = 0; // compteur d'erreurs

	  function afficherAlbum() 
	  {
		if (photos.length > 0 && !firstDisplayed) {
		  albumDiv.classList.remove("hidden");
		  mainPhoto.src = photos[0];
		  thumbnails.innerHTML = "";

		  photos.forEach((src, i) => {
			const thumb = document.createElement("img");
			thumb.src = src;
			if (i === 0) thumb.classList.add("active");
			thumb.addEventListener("click", () => {
			  changerImage(i);
			});
			thumbnails.appendChild(thumb);
		  });

		  activerInteractions(mainPhoto);
		  lancerCarrousel();
		  firstDisplayed = true;
		}
	  }

	  function chargerImage() 
	  {
		// on arrête si trop d'erreurs consécutives
		if (erreursConsecutives >= 1) return;

		const img = new Image();
		img.src = `${articleID}/${index}.jpg`;
		img.onload = () => {
		  photos.push(img.src);
		  erreursConsecutives = 0; // reset erreurs
		  if (!firstDisplayed) {
			afficherAlbum();
		  } else {
			const thumb = document.createElement("img");
			thumb.src = img.src;
			thumb.addEventListener("click", () => {
			  changerImage(photos.length - 1);
			});
			thumbnails.appendChild(thumb);
		  }
		  index++;
		  chargerImage();
		};
		img.onerror = () => {
		  erreursConsecutives++;
		  index++;
		  chargerImage();
		};
	  }
	  
	  chargerImage();
	}
  //----------------------------------------------------------------------------

  //Chargement de la vidéo liée à l'article ------------------------------------
  function chargerVideo(articleID) 
  {
    const videoContainer = document.getElementById("videoContainer");
    const video = document.getElementById("productVideo");
    const source = video.querySelector("source");

    source.src = `${articleID}/${articleID}.mp4`;
    video.load(); // recharge la vidéo
    videoContainer.classList.remove("hidden");
  }
  //----------------------------------------------------------------------------
  
  function normalizeSelects() 
  {
      document.querySelectorAll("select").forEach(sel => {
        sel.style.height = "44px";
        sel.style.minHeight = "44px";
        sel.style.lineHeight = "44px";
        sel.style.padding = "0 36px 0 12px";
        sel.style.fontSize = "16px";
        sel.style.fontFamily = "'Cairo', sans-serif";
      });
    }
