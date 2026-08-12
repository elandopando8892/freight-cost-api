# Onboarding de carrier

`GET /onboarding/carrier` devuelve un checklist calculado con evidencia de la
organización: perfil operativo, base activa con versión publicada, ruta de
producción, cotización confirmada y RateBook publicado.

`PUT /onboarding/carrier/profile` permite a `ADMIN` u `OPERATOR` completar la
identidad operativa básica. No crea una base, ruta, cotización, RateBook ni una
integración externa. Cada paso restante dirige al módulo que requiere una
decisión explícita.

El perfil no sustituye validaciones regulatorias, documentos de carrier o
aprobaciones comerciales; esos datos deben incorporarse con sus propios
controles y evidencia.
