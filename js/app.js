// =================================================================
// NutriApp v2 - Interacción Multimodal, IA Explicable y Principios HAX
// Mejoras basadas en resultados SUS (Q2, Q4, Q5, Q6, Q8, Q9, Q10)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

  // --- 1. ESTADO DE LA APLICACIÓN ---
  const META_KCAL = 2200;
  const META_PRO = 140;
  const META_CARB = 250;
  const META_GRA = 70;

  let registrosComidas = [
    { id: 1, categoria: 'Desayuno', nombre: 'Avena con plátano', gramos: 250, kcal: 320, pro: 12, carb: 58, gra: 5 },
    { id: 2, categoria: 'Almuerzo', nombre: 'Pechuga de pollo con arroz integral', gramos: 300, kcal: 433, pro: 50, carb: 38, gra: 7 },
    { id: 3, categoria: 'Snack', nombre: 'Yogur griego natural', gramos: 150, kcal: 146, pro: 15, carb: 4, gra: 8 }
  ];

  // Historial para recuperación ante errores (Undo - HAX Error Recovery)
  let ultimoEstadoBackup = null;
  let toastTimeout = null;

  // --- 2. REFERENCIAS DOM ---
  const cifraConsumidas = document.querySelector('#progreso .resumen article:nth-child(1) .cifra');
  const cifraRestantes = document.querySelector('#progreso .resumen article:nth-child(2) .cifra');
  const notaRestantes = document.querySelector('#progreso .resumen article:nth-child(2) .nota:nth-child(3)');
  const heroResumenKcal = document.getElementById('hero-resumen-kcal');

  const meterPro = document.getElementById('m-pro');
  const meterCarb = document.getElementById('m-carb');
  const meterGra = document.getElementById('m-gra');

  const labelProText = document.querySelector('label[for="m-pro"] span:nth-child(2)');
  const labelCarbText = document.querySelector('label[for="m-carb"] span:nth-child(2)');
  const labelGraText = document.querySelector('label[for="m-gra"] span:nth-child(2)');

  const contenedorLista = document.getElementById('lista-comidas-registradas');
  const formEdicion = document.getElementById('form-corregir-comida');
  const inputEditId = document.getElementById('edit-comida-id');
  const inputEditNombre = document.getElementById('edit-nombre');
  const inputEditGramos = document.getElementById('edit-gramos');
  const inputEditKcal = document.getElementById('edit-kcal');
  const btnCancelarEdit = document.getElementById('btn-cancelar-edit');

  // --- 3. NOTIFICACIONES TOAST Y DESHACER (HAX Error Recovery) ---
  const toastEl = document.getElementById('toast-hax');
  const toastMsg = document.getElementById('toast-mensaje');
  const btnToastUndo = document.getElementById('btn-toast-undo');

  function mostrarToast(mensaje, permitirDeshacer = false) {
    if (!toastEl) return;
    toastMsg.textContent = mensaje;
    btnToastUndo.style.display = permitirDeshacer ? 'inline-flex' : 'none';
    toastEl.classList.add('visible');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 6000);
  }

  if (btnToastUndo) {
    btnToastUndo.addEventListener('click', () => {
      if (ultimoEstadoBackup) {
        registrosComidas = JSON.parse(JSON.stringify(ultimoEstadoBackup));
        ultimoEstadoBackup = null;
        actualizarProgresoNutricional();
        mostrarToast('↩ Cambio revertido correctamente.', false);
      }
    });
  }

  function guardarBackup() {
    ultimoEstadoBackup = JSON.parse(JSON.stringify(registrosComidas));
  }

  function agregarRegistroAlDiario(nuevoItem) {
    guardarBackup();
    registrosComidas.push({
      id: Date.now(),
      ...nuevoItem
    });
    actualizarProgresoNutricional();
    mostrarToast(`✓ Añadido: ${nuevoItem.nombre} (${nuevoItem.kcal} kcal)`, true);
  }

  // --- 4. ACTUALIZACIÓN DE PROGRESO Y RECOMENDACIONES IA ---
  let modoVegetariano = false;

  function actualizarRecomendacionIA(totalPro, totalKcal) {
    const titulo = document.getElementById('rec-titulo');
    const explicacion = document.getElementById('rec-explicacion');
    const btnAceptar = document.getElementById('btn-aceptar-recomendacion');
    if (!titulo || !explicacion || !btnAceptar) return;

    const proFaltante = Math.max(0, META_PRO - totalPro);

    if (proFaltante === 0) {
      titulo.textContent = '¡Excelente! Ya cubriste tu meta diaria de proteínas';
      explicacion.innerHTML = '<strong>¿Por qué?</strong> Alcanzaste tus 140 g de proteína. Para mantener equilibrio y prevenir anemia, sugerimos <strong>Ensalada de espinaca con limón (35 kcal · 3 mg hierro)</strong>.';
      btnAceptar.dataset.sugerencia = JSON.stringify({ categoria: 'Cena', nombre: 'Ensalada de espinaca y limón', gramos: 100, kcal: 35, pro: 3, carb: 4, gra: 0 });
    } else if (modoVegetariano) {
      titulo.textContent = `Te faltan ${proFaltante} g de proteína · Opción vegetal con hierro`;
      explicacion.innerHTML = `<strong>¿Por qué?</strong> Llevas ${totalPro} g de ${META_PRO} g de proteína y elegiste preferencia vegetariana. Sugerimos <strong>Lentejas con ensalada y limón (150 g · 175 kcal · 7 mg hierro)</strong> para maximizar absorción.`;
      btnAceptar.dataset.sugerencia = JSON.stringify({ categoria: 'Cena', nombre: 'Lentejas con limón', gramos: 150, kcal: 175, pro: 13, carb: 30, gra: 1 });
    } else {
      titulo.textContent = `Te faltan ${proFaltante} g de proteína y refuerzo de hierro hoy`;
      explicacion.innerHTML = `<strong>¿Por qué?</strong> Tus registros actuales suman ${totalPro} g de ${META_PRO} g de proteína (${totalKcal} kcal). Sugerimos <strong>Sangrecita de pollo saltada (100 g · 135 kcal · 29 mg hierro)</strong>.`;
      btnAceptar.dataset.sugerencia = JSON.stringify({ categoria: 'Cena', nombre: 'Sangrecita de pollo saltada', gramos: 100, kcal: 135, pro: 22, carb: 2, gra: 4 });
    }
  }

  function actualizarProgresoNutricional() {
    let totalKcal = 0;
    let totalPro = 0;
    let totalCarb = 0;
    let totalGra = 0;

    registrosComidas.forEach(item => {
      totalKcal += item.kcal;
      totalPro += item.pro;
      totalCarb += item.carb;
      totalGra += item.gra;
    });

    if (cifraConsumidas) cifraConsumidas.textContent = `${totalKcal.toLocaleString()} kcal`;
    if (heroResumenKcal) heroResumenKcal.textContent = `Mi Plan de hoy: ${totalKcal.toLocaleString()} de ${META_KCAL.toLocaleString()} kcal.`;

    const restantes = META_KCAL - totalKcal;
    if (cifraRestantes) cifraRestantes.textContent = `${restantes > 0 ? restantes.toLocaleString() : 0} kcal`;

    const proFaltante = META_PRO - totalPro;
    if (notaRestantes) {
      notaRestantes.textContent = proFaltante > 0
        ? `Te faltan ${proFaltante} g de proteína`
        : '¡Meta de proteína alcanzada!';
    }

    if (meterPro) { meterPro.value = totalPro; if (labelProText) labelProText.textContent = `${totalPro} / ${META_PRO} g`; }
    if (meterCarb) { meterCarb.value = totalCarb; if (labelCarbText) labelCarbText.textContent = `${totalCarb} / ${META_CARB} g`; }
    if (meterGra) { meterGra.value = totalGra; if (labelGraText) labelGraText.textContent = `${totalGra} / ${META_GRA} g`; }

    actualizarRecomendacionIA(totalPro, totalKcal);
    renderizarListaComidas();
  }

  function renderizarListaComidas() {
    if (!contenedorLista) return;
    contenedorLista.innerHTML = '';

    if (registrosComidas.length === 0) {
      contenedorLista.innerHTML = '<p class="nota">No hay comidas registradas hoy. Usa el dictado por voz o el asistente IA para añadir una.</p>';
      return;
    }

    registrosComidas.forEach(comida => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'tarjeta';
      itemDiv.style.marginBottom = '0.6rem';
      itemDiv.style.display = 'flex';
      itemDiv.style.justifyContent = 'space-between';
      itemDiv.style.alignItems = 'center';
      itemDiv.style.flexWrap = 'wrap';
      itemDiv.style.gap = '0.5rem';

      itemDiv.innerHTML = `
        <div>
          <strong>${comida.categoria}:</strong> ${comida.nombre} (${comida.gramos} g) – <span style="color: var(--verde); font-weight: bold;">${comida.kcal} kcal</span>
        </div>
        <div style="display:flex; gap:0.4rem;">
          <button type="button" class="boton btn-editar" data-id="${comida.id}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">✏️ Corregir</button>
          <button type="button" class="boton boton-sec btn-eliminar" data-id="${comida.id}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" aria-label="Eliminar registro">✕</button>
        </div>
      `;
      contenedorLista.appendChild(itemDiv);
    });

    escucharEventosAcciones();
  }

  // --- 5. EDICIÓN ASISTIDA Y RECÁLCULO AUTOMÁTICO (HAX Error Recovery) ---
  let densidadKcalActual = 1.5;

  function escucharEventosAcciones() {
    document.querySelectorAll('.btn-editar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.getAttribute('data-id'));
        const item = registrosComidas.find(c => c.id === id);

        if (item) {
          inputEditId.value = item.id;
          inputEditNombre.value = item.nombre;
          inputEditGramos.value = item.gramos;
          inputEditKcal.value = item.kcal;
          densidadKcalActual = item.gramos > 0 ? item.kcal / item.gramos : 1.5;
          formEdicion.style.display = 'block';
          inputEditGramos.focus();
        }
      });
    });

    document.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.getAttribute('data-id'));
        const eliminado = registrosComidas.find(c => c.id === id);
        guardarBackup();
        registrosComidas = registrosComidas.filter(c => c.id !== id);
        actualizarProgresoNutricional();
        mostrarToast(`Registro eliminado: ${eliminado ? eliminado.nombre : ''}`, true);
      });
    });
  }

  // Recálculo automático de kcal cuando el usuario cambia los gramos
  if (inputEditGramos) {
    inputEditGramos.addEventListener('input', () => {
      const nuevosGramos = Number(inputEditGramos.value);
      if (nuevosGramos > 0) {
        inputEditKcal.value = Math.round(nuevosGramos * densidadKcalActual);
      }
    });
  }

  if (formEdicion) {
    formEdicion.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = Number(inputEditId.value);
      const index = registrosComidas.findIndex(c => c.id === id);

      if (index !== -1) {
        guardarBackup();
        registrosComidas[index].nombre = inputEditNombre.value.trim();
        registrosComidas[index].gramos = Number(inputEditGramos.value);
        registrosComidas[index].kcal = Number(inputEditKcal.value);
        registrosComidas[index].pro = Math.round(registrosComidas[index].kcal * 0.11);

        formEdicion.style.display = 'none';
        actualizarProgresoNutricional();
        mostrarToast(`✓ Registro actualizado: ${registrosComidas[index].nombre}`, true);
      }
    });
  }

  if (btnCancelarEdit) {
    btnCancelarEdit.addEventListener('click', () => {
      formEdicion.style.display = 'none';
    });
  }

  // --- 6. PESTAÑAS MULTIMODALES (VOZ / IMAGEN / TEXTO) ---
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.panel-multimodal');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => { b.classList.remove('activo'); b.setAttribute('aria-selected', 'false'); });
      tabPanels.forEach(p => p.classList.remove('activo'));

      btn.classList.add('activo');
      btn.setAttribute('aria-selected', 'true');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('activo');
    });
  });

  // --- 7. RECONOCIMIENTO DE VOZ (Web Speech API con fallback) ---
  const btnMicReal = document.getElementById('btn-microfono-real');
  const estadoVozReal = document.getElementById('estado-voz-real');

  if (btnMicReal) {
    btnMicReal.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        estadoVozReal.innerHTML = '⚠️ Tu navegador no soporta micrófono directo. Usa las <strong>frases de prueba</strong> de abajo o el <strong>Asistente NutriBot</strong>.';
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'es-PE';
      recognition.interimResults = false;

      btnMicReal.classList.add('grabando');
      btnMicReal.textContent = '🔴 Escuchando... di tu comida';
      estadoVozReal.textContent = 'Habla cerca del micrófono (ej. "Dos huevos con pan" o "Pollo con arroz")...';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        estadoVozReal.innerHTML = `✓ Escuchado: <strong>"${transcript}"</strong>. Puedes confirmarlo abajo.`;
        const lower = transcript.toLowerCase();
        if (lower.includes('avena') || lower.includes('canela')) {
          document.getElementById('d-avena').checked = true;
        } else if (lower.includes('pollo') || lower.includes('arroz')) {
          document.getElementById('d-pollo').checked = true;
        } else {
          document.getElementById('h1a').value = transcript;
          document.getElementById('d-huevos').checked = true;
        }
      };

      recognition.onerror = () => {
        estadoVozReal.textContent = 'No se detectó audio. Selecciona uno de los dictados de ejemplo de abajo para probar.';
      };

      recognition.onend = () => {
        btnMicReal.classList.remove('grabando');
        btnMicReal.textContent = '🎤 Hablar ahora';
      };

      recognition.start();
    });
  }

  // Chips de desambiguación rápida (canela vs panela)
  document.querySelectorAll('.chip-opcion').forEach(chip => {
    chip.addEventListener('click', () => {
      const targetInput = document.getElementById(chip.dataset.target);
      const kcalSpan = document.getElementById(chip.dataset.kcalTarget);
      const formAvena = document.getElementById('form-avena-voz');

      if (targetInput) {
        targetInput.value = chip.dataset.val;
        targetInput.classList.remove('campo-dudoso');
      }
      if (kcalSpan) kcalSpan.textContent = chip.dataset.newKcal;
      if (formAvena) formAvena.dataset.kcal = chip.dataset.newKcal;
      mostrarToast(`Corregido a "${chip.dataset.val}"`, false);
    });
  });

  // Formularios de registro directo desde voz
  document.querySelectorAll('.form-registro-directo').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputs = form.querySelectorAll('input[type="text"]');
      const nums = form.querySelectorAll('input[type="number"]');
      const nombreCombinado = Array.from(inputs).map(i => i.value.trim()).filter(Boolean).join(' + ');
      const gramosTotales = Array.from(nums).reduce((acc, n) => acc + Number(n.value || 0), 0);

      agregarRegistroAlDiario({
        categoria: form.dataset.categoria || 'Comida',
        nombre: nombreCombinado,
        gramos: gramosTotales || 150,
        kcal: Number(form.dataset.kcal) || 250,
        pro: Number(form.dataset.pro) || 15,
        carb: Number(form.dataset.carb) || 25,
        gra: Number(form.dataset.gra) || 8
      });

      document.getElementById('progreso').scrollIntoView({ behavior: 'smooth' });
    });
  });

  // --- 8. RECONOCIMIENTO DE IMÁGENES (IA Visión Simulada) ---
  const resFotoBox = document.getElementById('resultado-escaneo-foto');
  const fotoBadge = document.getElementById('foto-badge-confianza');
  const fotoTitulo = document.getElementById('foto-titulo-detectado');
  const fotoExp = document.getElementById('foto-explicacion-ia');
  const fotoAlimento = document.getElementById('foto-alimento');
  const fotoGramos = document.getElementById('foto-gramos');
  const fotoResumen = document.getElementById('foto-resumen-nutrientes');
  const formConfirmarFoto = document.getElementById('form-confirmar-foto');

  let datosFotoActual = { kcal: 240, pro: 25, carb: 18, gra: 6 };

  function cargarEscaneoFoto(confianza, titulo, exp, nombre, gramos, datosNutri) {
    if (!resFotoBox) return;
    resFotoBox.style.display = 'block';
    fotoBadge.textContent = `✓ Detección visual IA: ${confianza}% de confianza`;
    fotoTitulo.textContent = titulo;
    fotoExp.textContent = exp;
    fotoAlimento.value = nombre;
    fotoGramos.value = gramos;
    datosFotoActual = datosNutri;
    fotoResumen.textContent = `${datosNutri.kcal} kcal (${datosNutri.pro} g prot · ${datosNutri.carb} g carb · ${datosNutri.gra} g grasas)`;
  }

  const inputFoto = document.getElementById('input-foto-plato');
  if (inputFoto) {
    inputFoto.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const fileName = e.target.files[0].name;
        cargarEscaneoFoto(
          89,
          `Imagen analizada: ${fileName}`,
          'Segmentación visual completada. Verifica el nombre y porción antes de guardar.',
          'Plato casero balanceado (estimado)',
          280,
          { kcal: 380, pro: 28, carb: 42, gra: 10 }
        );
      }
    });
  }

  const btnSimSangrecita = document.getElementById('btn-simular-foto-sangrecita');
  if (btnSimSangrecita) {
    btnSimSangrecita.addEventListener('click', () => {
      cargarEscaneoFoto(
        93,
        'Detectado: Sangrecita saltada + Papa sancochada',
        'Alta concentración de hierro hemínico (≈29 mg/100g). Porción estimada por volumen en plato.',
        'Sangrecita saltada con papa',
        220,
        { kcal: 265, pro: 24, carb: 28, gra: 5 }
      );
    });
  }

  const btnSimSalmon = document.getElementById('btn-simular-foto-salmon');
  if (btnSimSalmon) {
    btnSimSalmon.addEventListener('click', () => {
      cargarEscaneoFoto(
        95,
        'Detectado: Filete de Salmón Atlántico (150 g)',
        'Rico en proteínas (30 g) y Omega-3. Porción estimada según grosor del filete.',
        'Salmón Atlántico a la plancha',
        150,
        { kcal: 312, pro: 30, carb: 0, gra: 19.5 }
      );
    });
  }

  if (formConfirmarFoto) {
    formConfirmarFoto.addEventListener('submit', (e) => {
      e.preventDefault();
      agregarRegistroAlDiario({
        categoria: 'Almuerzo',
        nombre: fotoAlimento.value.trim(),
        gramos: Number(fotoGramos.value) || 200,
        ...datosFotoActual
      });
      document.getElementById('progreso').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // --- 9. INGRESO RÁPIDO ASISTIDO ---
  const formRapido = document.getElementById('form-ingreso-rapido');
  if (formRapido) {
    formRapido.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = document.getElementById('rapido-alimento').value.trim();
      const gramos = Number(document.getElementById('rapido-gramos').value) || 150;
      const categoria = document.getElementById('rapido-categoria').value;
      const kcalEst = Math.round(gramos * 1.35);

      agregarRegistroAlDiario({
        categoria,
        nombre,
        gramos,
        kcal: kcalEst,
        pro: Math.round(gramos * 0.08),
        carb: Math.round(gramos * 0.16),
        gra: Math.round(gramos * 0.04)
      });
      formRapido.reset();
      document.getElementById('progreso').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // --- 10. BOTONES DE HIERRO (H02) Y DETALLE SALMÓN (H04) ---
  document.querySelectorAll('.btn-add-hierro').forEach(btn => {
    btn.addEventListener('click', () => {
      agregarRegistroAlDiario({
        categoria: 'Almuerzo',
        nombre: btn.dataset.nombre,
        gramos: Number(btn.dataset.gramos),
        kcal: Number(btn.dataset.kcal),
        pro: Number(btn.dataset.pro),
        carb: Number(btn.dataset.carb),
        gra: Number(btn.dataset.gra)
      });
    });
  });

  const btnAceptarRec = document.getElementById('btn-aceptar-recomendacion');
  if (btnAceptarRec) {
    btnAceptarRec.addEventListener('click', () => {
      if (btnAceptarRec.dataset.sugerencia) {
        agregarRegistroAlDiario(JSON.parse(btnAceptarRec.dataset.sugerencia));
      }
    });
  }

  const btnCambiarRec = document.getElementById('btn-cambiar-recomendacion');
  if (btnCambiarRec) {
    btnCambiarRec.addEventListener('click', () => {
      modoVegetariano = !modoVegetariano;
      btnCambiarRec.textContent = modoVegetariano ? '🔄 Ver opción origen animal' : '🔄 Otra opción (Vegetariana)';
      actualizarProgresoNutricional();
    });
  }

  const formSalmon = document.getElementById('form-detalle-salmon');
  if (formSalmon) {
    formSalmon.addEventListener('submit', (e) => {
      e.preventDefault();
      const categoria = document.getElementById('comida').value || 'Almuerzo';
      let gramos = 150, kcal = 312, pro = 30, gra = 19.5;
      if (document.getElementById('p100').checked) { gramos = 100; kcal = 208; pro = 20; gra = 13; }
      if (document.getElementById('p200').checked) { gramos = 200; kcal = 416; pro = 40; gra = 26; }

      agregarRegistroAlDiario({
        categoria,
        nombre: `Salmón Atlántico Fresco (${gramos} g)`,
        gramos,
        kcal,
        pro,
        carb: 0,
        gra
      });
      document.getElementById('progreso').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // --- 11. ASISTENTE CONVERSACIONAL CONTEXTUAL ("NutriBot") ---
  const panelBot = document.getElementById('panel-nutribot');
  const btnToggleBot = document.getElementById('btn-toggle-nutribot');
  const btnCerrarBot = document.getElementById('btn-cerrar-nutribot');
  const mensajesBot = document.getElementById('nutribot-mensajes');
  const formBot = document.getElementById('form-nutribot');
  const inputBot = document.getElementById('input-nutribot');

  function toggleNutriBot(forzarAbrir = null) {
    if (!panelBot) return;
    const abrir = forzarAbrir !== null ? forzarAbrir : !panelBot.classList.contains('abierto');
    panelBot.classList.toggle('abierto', abrir);
    if (btnToggleBot) btnToggleBot.setAttribute('aria-expanded', String(abrir));
    if (abrir && inputBot) inputBot.focus();
  }

  if (btnToggleBot) btnToggleBot.addEventListener('click', () => toggleNutriBot());
  if (btnCerrarBot) btnCerrarBot.addEventListener('click', () => toggleNutriBot(false));
  ['btn-abrir-nutribot-nav', 'btn-abrir-nutribot-hero', 'link-tarjeta-bot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', (e) => { e.preventDefault(); toggleNutriBot(true); });
  });

  function agregarMensajeChat(texto, tipo = 'bot') {
    const div = document.createElement('div');
    div.className = tipo === 'user' ? 'msg-user' : 'msg-bot';
    div.innerHTML = texto;
    mensajesBot.appendChild(div);
    mensajesBot.scrollTop = mensajesBot.scrollHeight;
  }

  function procesarConsultaBot(consulta) {
    agregarMensajeChat(consulta, 'user');
    const q = consulta.toLowerCase();

    setTimeout(() => {
      if (q.includes('recomienda') || q.includes('como hoy')) {
        const totalPro = registrosComidas.reduce((s, c) => s + c.pro, 0);
        const falta = Math.max(0, META_PRO - totalPro);
        agregarMensajeChat(`Hoy llevas <strong>${totalPro} g</strong> de proteína (te faltan <strong>${falta} g</strong>). Te recomiendo <strong>Sangrecita saltada (29 mg hierro)</strong> o <strong>Lentejas con limón</strong>. Puedes añadirlas directo en la sección <em>Mi Progreso</em>.`);
      } else if (q.includes('huevo') || q.includes('registra')) {
        agregarRegistroAlDiario({ categoria: 'Desayuno', nombre: '2 Huevos revueltos con pan', gramos: 155, kcal: 236, pro: 16, carb: 18, gra: 11 });
        agregarMensajeChat('✓ ¡Listo! Registré <strong>2 Huevos revueltos con pan (236 kcal)</strong> en tu progreso. Si me equivoqué, pulsa <em>Deshacer</em> abajo a la izquierda.');
      } else if (q.includes('anemia') || q.includes('hierro')) {
        agregarMensajeChat('Para prevenir la anemia prioriza <strong>sangrecita (29 mg)</strong>, <strong>bazo (28 mg)</strong> o <strong>lentejas (7 mg)</strong> acompañadas siempre con vitamina C (limón o naranja). Evita café o té junto con las comidas.');
      } else if (q.includes('corrijo') || q.includes('error')) {
        agregarMensajeChat('Es muy fácil: baja a <strong>Mi Progreso</strong>, pulsa <strong>✏️ Corregir</strong> en cualquier comida y cambia los gramos; yo recalcularé las calorías por ti.');
      } else {
        agregarMensajeChat('Entendido. Puedo ayudarte a <strong>registrar comidas</strong> (ej. "Registra 2 huevos con pan"), <strong>sugerirte alimentos con hierro</strong> o explicarte cómo ajustar tus porciones.');
      }
    }, 300);
  }

  if (formBot) {
    formBot.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = inputBot.value.trim();
      if (!val) return;
      inputBot.value = '';
      procesarConsultaBot(val);
    });
  }

  document.querySelectorAll('.nutribot-sugerencias button').forEach(btn => {
    btn.addEventListener('click', () => {
      procesarConsultaBot(btn.dataset.prompt);
    });
  });

  // Inicializar interfaz
  actualizarProgresoNutricional();
});
