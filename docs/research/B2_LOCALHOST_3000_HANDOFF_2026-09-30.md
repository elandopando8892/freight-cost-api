# B2 · origen local único y credencial Maps restringida

Usuario autorizó mover la prueba completa a localhost:3000 y reemplazar sólo los dos orígenes de FCM Maps Web Local. Cambio ejecutado; **configuración comprobada, aceptación autenticada pendiente**.

## Evidencia y alcance

- Worktree D:/andre/worktrees/freight-cost-model/cost-tires-release-20260927; rama codex/cost-tires-release-s14; HEAD 4f5fc2de0c3d178dace917231e1092040dec21fd. AGENTS global/web revisados; cambios ajenos conservados. Sin nueva rama, commit, deploy o PR.
- Benchmark reutilizado: diagnóstico OAuth previo, documentación Next instalada sobre precedencia de variables y [Redirect URLs de Supabase](https://supabase.com/docs/guides/auth/redirect-urls). Changelog consultado sin cambio relevante al contrato de retornos. La habilidad Supabase motivó comprobar cobertura exacta; computer-use, comprobar restricciones guardadas sin revelar secretos.
- GET de Auth rateware-prod/alqjqzqagdmcywpjtnnr confirma **`http://localhost:3000/**`**: no es sólo una URL raíz. El formato de los documentos anteriores ocultaba los asteriscos en Markdown; esta escritura en código conserva el patrón real. Cubre `/auth/callback` según contrato documentado; esto no prueba login completo.
- Lista intacta: 37 entradas, 2022 caracteres, SHA256 c1f73bf357deff211c289426b3f2b7c6ed7847afe9a46aaef44d1ae9edaa1575. Site URL `https://rates.heymarksman.com/` intacto. Cero PATCH de Auth en este corte; no eliminar retornos ajenos ni reintentar los rechazos anteriores.
- Google rateware: únicamente recurso b7a9e18e-309a-4eea-b787-2867174cad12, **FCM Maps Web Local**. Orígenes anteriores `http://127.0.0.1:3001/*` y `http://localhost:3001/*` reemplazados por **`http://localhost:3000/*`**. Websites permanece seleccionado, None no seleccionado; sólo **1 API: Maps JavaScript API**. Guardado y reabierto detalle confirman persistencia. No mostrar, copiar, rotar ni crear clave; no tocar Bidware u otra credencial. [Captura segura](B2_MAPS_LOCALHOST_3000_2026-09-30.jpg). Consola advierte propagación de hasta cinco minutos.
- Sesión propia anterior 86777 detenida; puertos 3000/3001/3002 libres antes de arranque. Next sesión **20110**, listener 127.0.0.1:3000 (loopback). Navegador abre **http://localhost:3000/login** con branding MARKSMAN y Google/Supabase. `NEXT_PUBLIC_SITE_URL=http://localhost:3000`; redirectTo real en loginWithGoogle resulta `http://localhost:3000/auth/callback`.
- Sólo overrides de proceso: API_URL `http://127.0.0.1:3002` para separar web/API; Supabase URL/publishable key públicos existentes seleccionados, sin copiar archivo completo. Token de gestión, clave OpenAI y variables Vercel excluidos del hijo. Archivo privado browser key intacto/ignorado.

## Prueba y límites

Configuración real Google guardada/reabierta; lectura Auth actual; listener y pantalla login reales. No cambios de implementación: no repetir builds/suites previas por esta operación. Login, intercambio de código, sesión, recarga y renovación **no certificados**. No iniciar login por agente ni reutilizar códigos recibidos. Usuario debe pulsar Continuar con Google desde este origen nuevo, con su cuenta existente.

API local **no habilitada**: falta acreditar runtime seguro; no utilizar conexión histórica Kinde/Neon ni provocar provisionamiento mediante middleware. No consultar candidato todavía. Maps/Routes nuevos **0/0**, presupuesto acotado previo sin consumir. Sin SQL, migración, usuarios, persistencia de negocio, IA de aplicación o producción. B2 parcial, cero adopciones, 0/4 gates; no confundir cobertura de configuración con aceptación real.

## Recuperación y siguiente

Para retirar proceso local detener sólo sesión 20110; overrides son efímeros, no se editó .env. Restauración remota, si se solicita, debe volver únicamente a los dos orígenes anteriores de esta misma clave manteniendo Maps JavaScript API; no rotar ni eliminar credencial. No rollback Auth necesario: permanece intacto.

Checklist antes de repetir prueba: origen visible localhost:3000; appOrigin/callback mismo origen; cobertura `/**` comprobada; PKCE nunca cruzar localhost/127 ni puertos; login fresco sin código anterior; después verificar intercambio, sesión y recarga; API segura acreditada antes del único intento de Maps/Routes. Renovación y permisos requieren evidencia separada. Este corte no sustituye checks de release OAuth de previews.

Modelo recomendado GPT-6.1 Sol · esfuerzo medio para configuración/readback; selector no cambiado y tokens no medidos. Siguiente: sesión real del usuario → acreditar API sin efectos de negocio → recorrido acotado ya autorizado.
