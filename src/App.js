import React,{useEffect, useState} from 'react';
import './App.css';


function App() {

  const [joke,setjoke] = useState("loading");

  const newJoke = () =>{
    fetch("http://api.icndb.com/jokes/random?firstName=John&lastName=Doe").
    then(res=>res.json())
    .then(res2=>{
      console.log(res2)
      setjoke(res2.value.joke)
    })
  }

  useEffect(()=>{
    newJoke()
  },[]);

  return (
    <div className="App">
      <div className='newData'>
      <h3 className='JokeHead'>Joke Section</h3>
      <h4 className='data'>{joke}</h4>
      <button onClick={()=>newJoke()}>Get Another Joke</button>
      </div>
    </div>
  );  
}

export default App;
