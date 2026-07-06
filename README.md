The project is for a realtime quiz.
(user) index.html -> the mobile frontend for the partecipants
(admin) admin/index.html -> the controller of the quiz
(display) display/index.html -> the quiz presentation
TODO (presenter) presenter/index.html -> for presenters

It is designed as a serverless web app communicating only via firebase realtime db; apart from user registration and answers, the state flow is unidirectional: admin publishes, other endpoints display with little or no internal state.

The quiz logic is divided in four main parts:
- people: manages the participants list and ranking
- quiz: manages the overall logic and state of the quiz; loads the definition from a md file
- games: provides a specific workflow and visuals for a group of questions
- questions: ask a single question and evaluate the results

this design is built to make the features extendible: questions are decoupled from specific games (user interface mainly focuses on this, game-independant); both games and questions can be added with only the code that is logically needed to describe the specific logic, with as little boilerplate as possible.
