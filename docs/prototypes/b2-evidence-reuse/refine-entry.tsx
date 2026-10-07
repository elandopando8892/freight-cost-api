import { createRoot } from 'react-dom/client';
import { Provider, useEvidence } from './refine';
import { Review } from './review';
import './style.css';
createRoot(document.getElementById('root')!).render(<Provider><Review variant="Refine" useEvidence={useEvidence} /></Provider>);
