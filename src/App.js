import React from 'react';
import './App.css';
import { LCHost } from './LC';
import Charts from './Charts';

function App() {

  return (
    // NOTE: LCHost should be defined at the top of component tree, before any and all LCJS based components
    // This let's them share the same LC context for performance benefits.
    <LCHost>
      <div className="App">
          <Charts />
      </div>
    </LCHost>
  );
}

export default App;