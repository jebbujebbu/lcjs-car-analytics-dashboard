import './App.css';
import { LCHost } from './LC';
import ParallelChart from './Components/ParallelChart';
import BarChart from './Components/BarChart';

function App() {
  return (
    // NOTE: LCHost should be defined at the top of component tree, before any and all LCJS based components
    // This let's them share the same LC context for performance benefits.
    <LCHost>
      <div className="App">
        <div className="chart">
          <ParallelChart/>
        </div>
        <div className="chart">
          <BarChart/>
        </div>
      </div>
    </LCHost>
  );
}

export default App;
