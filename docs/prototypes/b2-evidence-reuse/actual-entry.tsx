import { createRoot } from 'react-dom/client';
import { Provider, useEvidence } from './actual';
import { Review } from './review';
import './style.css';
createRoot(document.getElementById('root')!).render(<Provider><Review variant="Actual" useEvidence={useEvidence} /></Provider>);
