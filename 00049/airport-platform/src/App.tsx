import { AirportProvider } from './context/AirportContext';
import Layout from './components/layout/Layout';

function App() {
  return (
    <AirportProvider>
      <Layout />
    </AirportProvider>
  );
}

export default App;
