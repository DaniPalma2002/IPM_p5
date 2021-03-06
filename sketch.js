// Bakeoff #2 - Seleção de Alvos Fora de Alcance
// IPM 2021-22, Período 3
// Entrega: até dia 22 de Abril às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 18 de Abril
// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER   = "61-AL";      // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY   = true;  // Set to 'true' before sharing during the bake-off day

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;
let inputArea        = {x: 0, y: 0, h: 0, w: 0}    // Position and size of the user input area

// Metrics
let testStartTime, testEndTime;// time between the start and end of one attempt (54 trials)
let hits 			 = 0;      // number of successful selections
let misses 			 = 0;      // number of missed selections (used to calculate accuracy)
let database;                  // Firebase DB  

// Study control parameters
let draw_targets     = false;  // used to control what to show in draw()
let trials 			 = [];     // contains the order of targets that activate in the test
let current_trial    = 0;      // the current trial number (indexes into trials array above)
let attempt          = 0;      // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs        = [];     // add the Fitts ID for each selection here (-1 when there is a miss)

let strokeColor = 200;
let fillColor = 150;

// previous clicks (for fitts ID)
let prevClick_x = -1
let prevClick_y = -1


// snap cursor
let snapX;
let snapY;

// Target class (position and width)
class Target
{
  constructor(x, y, w)
  {
    this.x = x;
    this.y = y;
    this.w = w;
  }
}

let song;
let soundImage;

function preload() {
  song = loadSound("osu.wav");
  error_sound = loadSound("error.wav")
  soundImage = loadImage("iconSound.png");
  current_target = loadImage("alvo_atual.png");
  next_target = loadImage("alvo_seguinte.png");
  x2_target = loadImage("alvo_x2.png");
}


// Runs once at the start
function setup()
{
  createCanvas(700, 500);    // window size in px before we go into fullScreen()
  frameRate(60);             // frame rate (DO NOT CHANGE!)
  
  randomizeTrials();         // randomize the trial order at the start of execution
  
  textFont("Arial", 18);     // font size for the majority of the text
  drawUserIDScreen();        // draws the user start-up screen (student ID and display size)
  
  // sound volume
  song.setVolume(0.3);
  error_sound.setVolume(0.05);

}

// Runs every frame and redraws the screen
function draw()
{
  
  if (draw_targets)
  {     
    // The user is interacting with the 6x3 target grid
    background(color(0,0,0));        // sets background to black
    
    // Print trial count at the top left-corner of the canvas
    fill(color(255,255,255));
    textAlign(LEFT);
    text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);



    //Caption
    text("Legenda: ", inputArea.x, 50);

    image(current_target, inputArea.x, 70);
    text("Alvo atual ", inputArea.x + 80, 100);
    
    image(x2_target, inputArea.x, 170);
    text("Carregar duas vezes no alvo ", inputArea.x + 80, 200);

    image(next_target, inputArea.x, 270);
    text("Alvo seguinte ", inputArea.x + 80, 300);

    text("Recomendo fazerem pelos alvos da caixa de input",inputArea.x, 400);




    
    // Draw all 18 targets
	for (var i = 0; i < 18; i++) drawTarget(i);
    
    // Draw the user input area
    drawInputArea()



    // Draw the virtual cursor
    let x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width);
    let y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height);

    
    let snapMouse = getClosestTarget(x, y);
    
    snapX = getTargetBounds(snapMouse).x;
    snapY = getTargetBounds(snapMouse).y;


    fill(color(255,255,255));
    circle(snapX, snapY, 0.5 * PPCM);



    // change color of target while hovering
    let target = getTargetBounds(trials[current_trial]);

    if (insideInputArea(mouseX, mouseY))
    {
      

      if (dist(target.x, target.y, snapX, snapY) < target.w/2) {
        strokeColor = 255;
        fillColor = 255;
      }
      else {
        strokeColor = 200;
        fillColor = 150;
      }
    }
  }
  
}

// Print and save results at the end of 54 trials
function printAndSavePerformance()
{
  strokeWeight(0);
  // DO NOT CHANGE THESE! 
  let accuracy			= parseFloat(hits * 100) / parseFloat(hits + misses);
  let test_time         = (testEndTime - testStartTime) / 1000;
  let time_per_target   = nf((test_time) / parseFloat(hits + misses), 0, 3);
  let penalty           = constrain((((parseFloat(95) - (parseFloat(hits * 100) / parseFloat(hits + misses))) * 0.2)), 0, 100);
  let target_w_penalty	= nf(((test_time) / parseFloat(hits + misses) + penalty), 0, 3);
  let timestamp         = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();
  
  background(color(0,0,0));   // clears screen
  fill(color(255,255,255));   // set text fill color to white
  text(timestamp, 10, 20);    // display time on screen (top-left corner)
  
  textAlign(CENTER);
  text("Attempt " + (attempt + 1) + " out of 2 completed!", width/2, 60); 
  text("Hits: " + hits, width/2, 100);
  text("Misses: " + misses, width/2, 120);
  text("Accuracy: " + accuracy + "%", width/2, 140);
  text("Total time taken: " + test_time + "s", width/2, 160);
  text("Average time per target: " + time_per_target + "s", width/2, 180);
  text("Average time for each target (+ penalty): " + target_w_penalty + "s", width/2, 220);
  
  // Print Fitts IDS (one per target, -1 if failed selection, optional)
  text("Fitts Index of Performance", width/2, 260);
  textAlign(LEFT);
  text("Target 1: ---", width/4, 280);
  for (var i = 0; i < 26; i++) {
    if (fitts_IDs[i] == -1)
      text("Target " + (i+2) + ": MISSED", width/4, 300 + 20*i);
    else
      text("Target " + (i+2) + ": " + fitts_IDs[i], width/4, 300 + 20*i);
  }
  i = 0;
  for (var j = 26; j < 53; j++) {
    if (fitts_IDs[j] == -1)
      text("Target " + (j+2) + ": MISSED", (2*width)/3, 280 + 20*i);
    else
      text("Target " + (j+2) + ": " + fitts_IDs[j], (2*width)/3, 280 + 20*i);
    i++;
  }
  
  // Saves results (DO NOT CHANGE!)
  let attempt_data = 
  {
        project_from:       GROUP_NUMBER,
        assessed_by:        student_ID,
        test_completed_by:  timestamp,
        attempt:            attempt,
        hits:               hits,
        misses:             misses,
        accuracy:           accuracy,
        attempt_duration:   test_time,
        time_per_target:    time_per_target,
        target_w_penalty:   target_w_penalty,
        fitts_IDs:          fitts_IDs,
        // !! REMOVE ON BAKEOFF DAY !!
        //version:            "2.1"
  }
  
  // Send data to DB (DO NOT CHANGE!)
  if (BAKE_OFF_DAY)
  {
    // Access the Firebase DB
    if (attempt === 0)
    {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }
    
    // Add user performance results
    let db_ref = database.ref('G' + GROUP_NUMBER);
    db_ref.push(attempt_data);
  }
}



// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() 
{
  // Only look for mouse releases during the actual test
  // (i.e., during target selections)
  if (draw_targets)
  {
    // Get the location and size of the target the user should be trying to select
    let target = getTargetBounds(trials[current_trial]);   
    
    // Check to see if the virtual cursor is inside the target bounds,
    // increasing either the 'hits' or 'misses' counters
        
    if (insideInputArea(mouseX, mouseY))
    {
      //let virtual_x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width)
      //let virtual_y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height)

      if (dist(target.x, target.y, snapX, snapY) < target.w/2) {
        hits++;
        song.play();
        
        // fitts ID
        if (prevClick_x != -1 && prevClick_y != -1) {
          let x = Math.log2((dist(prevClick_x, prevClick_y, target.x, target.y)/target.w) + 1).toFixed(3);
          fitts_IDs.push(x);
        }
        
      }
      else {
        misses++;
        error_sound.play();
        fitts_IDs.push(-1);
      }
      //stores clicks 
      prevClick_x = snapX;
      prevClick_y = snapY;

      current_trial++;                 // Move on to the next trial/target
    }

    // Check if the user has completed all 54 trials
    if (current_trial === trials.length)
    {
      testEndTime = millis();
      draw_targets = false;          // Stop showing targets and the user performance results
      printAndSavePerformance();     // Print the user's results on-screen and send these to the DB
      attempt++;                      
      
      // If there's an attempt to go create a button to start this
      if (attempt < 2)
      {
        continue_button = createButton('START 2ND ATTEMPT');
        continue_button.mouseReleased(continueTest);
        continue_button.position(width/2 - continue_button.size().width/2, height/2 - continue_button.size().height/2);
      }
    } 
    // Check if this was the first selection in an attempt
    else if (current_trial === 1) testStartTime = millis();
  }
}

// Draw target on-screen
function drawTarget(i)
{
  // Get the location and size for target (i)
  let target = getTargetBounds(i);
  //let nextTarget = getTargetBounds(i+1);
  
  //line(target.x,target.y,nextTarget.x,nextTarget.y);
  let nextTarget = getTargetBounds(trials[current_trial + 1]);
  let prevTarget = getTargetBounds(trials[current_trial - 1]);

  
  //line(target.x,target.y,nextTarget.x,nextTarget.y);


  // next target is the same as the current
  if (trials[current_trial] === i && trials[current_trial + 1] === i) {
    
    

    fill(color(0,200,0));
    stroke(color(0,220,0));
    strokeWeight(10);
    circle(target.x, target.y, target.w);

    // see the colors
    fill(220,220,220);
    textSize(30);
    textAlign(CENTER);
    text('2x', target.x, target.y + 5);
    textSize(18);
    
  }

  // Check whether this target is the target the user should be trying to select
  else if (trials[current_trial] === i) 
  { 
    
    // Highlights the target the user should be trying to select
    // with a white border 150
    fill(color(0,fillColor,0));
    stroke(color(0,strokeColor,0));
    strokeWeight(10);

    circle(target.x, target.y, target.w);

    line(target.x,target.y,nextTarget.x,nextTarget.y);
    //noStroke();
    fill(color(0, fillColor, 0));
    //stroke(150);
    strokeWeight(3);
    
    

    
    
    
    // Remember you are allowed to access targets (i-1) and (i+1)
    // if this is the target the user should be trying to select
    //
  }


  //! next target !!!
  else if (trials[current_trial + 1] === i) {

    fill(color(100,0,0));
    stroke(color(120,0,0));
    strokeWeight(5);
    circle(target.x, target.y, target.w);
    noStroke();
  }


  // Does not draw a border if this is not the target the user
  // should be trying to select
  else {
    noStroke();
    fill(color(155,155,155));
    circle(target.x, target.y, target.w);
  }

  // input box targets
  let inputTargetX = map(target.x, 0, width, inputArea.x, inputArea.x + inputArea.w);
  let inputTargetY = map(target.y, 0, height, inputArea.y, inputArea.y + inputArea.h);  
  
  
  //circle(inputTargetX, inputTargetY, (target.w)*(inputArea.y/height));
  rectMode(CENTER);
  square(inputTargetX, inputTargetY, target.w * (inputArea.w/height));
  rectMode(CORNER);

  // Draws the target
  //fill(color(155,155,155));                 
  
}

// Returns the location and size of a given target
function getTargetBounds(i)
{
  var x = parseInt(LEFT_PADDING) + parseInt((i % 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
  var y = parseInt(TOP_PADDING) + parseInt(Math.floor(i / 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

  return new Target(x, y, TARGET_SIZE);
}

// Evoked after the user starts its second (and last) attempt
function continueTest()
{
  // Re-randomize the trial order
  shuffle(trials, true);
  current_trial = 0;
  print("trial order: " + trials);
  
  // Resets performance variables
  hits = 0;
  misses = 0;
  fitts_IDs = [];
  
  continue_button.remove();
  
  // Shows the targets again
  draw_targets = true;
  testStartTime = millis();  
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() 
{
  resizeCanvas(windowWidth, windowHeight);
    
  let display    = new Display({ diagonal: display_size }, window.screen);

  // DO NOT CHANGE THESE!
  PPI            = display.ppi;                        // calculates pixels per inch
  PPCM           = PPI / 2.54;                         // calculates pixels per cm
  TARGET_SIZE    = 1.5 * PPCM;                         // sets the target size in cm, i.e, 1.5cm
  TARGET_PADDING = 1.5 * PPCM;                         // sets the padding around the targets in cm
  MARGIN         = 1.5 * PPCM;                         // sets the margin around the targets in cm

  // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
  LEFT_PADDING   = width/3 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;        

  // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
  TOP_PADDING    = height/2 - TARGET_SIZE - 3.5 * TARGET_PADDING - 1.5 * MARGIN;
  
  // Defines the user input area (DO NOT CHANGE!)
  inputArea      = {x: width/2 + 2 * TARGET_SIZE,
                    y: height/2,
                    w: width/3,
                    h: height/3
                   }

  // Starts drawing targets immediately after we go fullscreen
  draw_targets = true;
}

// Responsible for drawing the input area -- Retângulo onde temos o nosso rato
function drawInputArea()
{
  noFill();
  stroke(color(220,220,220));
  strokeWeight(2);

  
  
  rect(inputArea.x, inputArea.y, inputArea.w, inputArea.h);
  //console.log("input area: " + inputArea.x + inputArea.y);
}


// Get the target closest to the mouse
function getClosestTarget(x, y) {

  let res = 0;
  let distance = 5000; 
  let temp = 0;

  for (var i = 0; i < 18; i++) {
    temp = getDistanceToTarget(x, y, i);
    if (temp < distance) {
      res = i;
      distance = temp;
    }
    
  }
  return res;
}

function getDistanceToTarget(x, y, i) {
  target = getTargetBounds(i);
  return dist(x, y, target.x, target.y);
}