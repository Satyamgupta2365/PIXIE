# Screenshots for Mars Rover Task Scheduler

This folder contains screenshots of the live test results demonstrating the deployed application functionality.

## Required Screenshots

Please add the following screenshots from your terminal testing:

### test-01-phase1-deployment.png
- Phase 1: Deployment Verification
- Shows API health check and endpoint registration
- Should display the JSON response from `GET /`

### test-02-phase2-nasa-data.png
- Phase 2: NASA Real-Time Data Integration
- Shows live Mars weather and mission data
- Should display NASA API response from `GET /nasa`

### test-03-nasa-realtime-full.png
- Test 5: NASA Real-Time Data Full Payload
- Complete NASA data payload with all fields
- Shows temperature, pressure, wind, comms status, etc.

### test-04-env-state-check.png
- Test 6: Environment State Check After Spectroscopy
- Shows rover state after completing a science task
- Displays battery level, completed tasks, remaining tasks

### test-05-imaging-task.png
- Test 7: Imaging Task Execution
- Shows execution of imaging task with reward calculation
- Displays updated battery and science collected

### test-06-rl-env-init.png
- Phase 3: RL Environment Initialization
- Shows initial environment state after reset
- Displays starting conditions and available tasks

### test-07-final-results.png
- Final Results Summary
- Shows mission accomplishments and deployment status
- Displays final scores and system verification

## How to Add Screenshots

1. Take screenshots of your terminal output during testing
2. Rename them according to the naming convention above
3. Place them in this `screenshots/` folder
4. Commit and push to update the README display

## File Format
- Use PNG format for best quality
- Recommended resolution: 1920x1080 or higher
- Include full terminal output in each screenshot