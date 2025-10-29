import { useEffect, useState } from 'react';
import './App.css';
import { LCHost } from './LC';
import Charts from './Charts';
import ParallelChart from './Components/ParallelChart';
// import ParallelChart from './Components/ParallelChart';
// import BarChart  from './Components/BarChart';
// import HistogramChart  from './Components/HistogramChart';

function App() {
  // const data = fetchData();
  // const [data, setData] = useState([]); // start empty

  // useEffect(() => {
  //   fetch('/assets/cars.json')
  //     .then((response) => response.json())
  //     .then((d) => setData(d || []))
  //     .catch((error) => {
  //       console.error('Error fetching data:', error);
  //       setData([]);
  //     });
  // }, []);


  return (
    // NOTE: LCHost should be defined at the top of component tree, before any and all LCJS based components
    // This let's them share the same LC context for performance benefits.
    <LCHost>
      <div className="App">
        {/* <div className="charts-container"> */}
          {/* <Charts data={data} /> */}
          <Charts />
        {/* </div> */}
        {/* <div className="chart">
          <ParallelChart data={data} />
        </div> */}
        {/* <div className="chart">
          <BarChart data={data} />
        </div> */}
        {/* <div className="chart">
          <HistogramChart data={data} />
        </div> */}
      </div>
    </LCHost>
  );
}

const fetchData = () => {
  fetch("/assets/cars.json")
    .then((response) => response.json())
    .then((data) => {
      // console.log("Fetched data:", data);
      return data;
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
};

export default App;