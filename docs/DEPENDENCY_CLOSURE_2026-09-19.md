# Dependencias del candidato

19 septiembre 2026. Next y eslint-config-next fijados en 16.3.3; sharp fijado por override en 0.35.4, compatible con el rango ^0.35.3 de Next. baseline-browser-mapping actualizado a 2.11.25. El lockfile refleja la instalación nested de las dependencias del workspace.

Resultado local: npm audit --omit=dev --package-lock-only devolvió vulnerabilities vacío, total 0. El build completo con Node 24.19.0 y Next 16.3.3 terminó con código 0, incluido TypeScript y generación de páginas. No hubo cambios visuales ni de esquema.

El lanzador npm.cmd del sistema usa Node 20.14.0 aunque se anteponga otro node al PATH. Se corrigió la ejecución usando Node 24 y npm-cli.js explícitos. npm 10.7 con estrategia de hoisting calculó paquetes nuevos pero mantuvo los antiguos; npm 10.8.1 con install-strategy=nested actualizó el workspace. Se verificaron las versiones efectivas del lockfile y el encabezado del build.

La auditoría general aún reporta hallazgos de herramientas de desarrollo; cero en dependencias de producción no constituye ausencia de riesgos. Pendiente clasificar desarrollo y publicar una nueva pareja web/API del mismo SHA. El preview 04c7ed7 sigue con dependencias anteriores.

Rollback de fuente: revertir el commit de dependencias y reinstalar desde su lockfile. No volver a aprobar producción con el conjunto vulnerable. Ningún cambio remoto de Auth, bases, usuarios o producción en esta entrega.

Modelo recomendado: Sol alto para implementación; Astra alto para criterio de seguridad. Se consultó la guía local de actualización de Next, sin cambios a APIs de aplicación.
