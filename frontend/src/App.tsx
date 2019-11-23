import React from "react";
import "./App.css";
import { HashRouter, Switch, Route } from "react-router-dom";
import { MainView } from "./views/MainView/MainView";

const App: React.FC = () => {
  return (
    <div className="App">
      <HashRouter basename="/">
        <Switch>
          <Route exact path="/">
            <MainView />
          </Route>
        </Switch>
      </HashRouter>
    </div>
  );
};

export default App;
