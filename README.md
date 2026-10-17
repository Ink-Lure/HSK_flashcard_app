# HSK Flashcards
## Introduction

As I have been learning Mandarin recently, I have been looking for a way to learn characters.
This has been quite unsuccessful as most have been rather clunky in my opinion or asking for payment.

Alongside this I haven't used much generative AI before for my coding projects, so I decided i would 
make use of it for once. *Hopefully not the start of a slippery slope*.

This project was almost entirely made through the use of [qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B) 
which was run locally using [Unsloth](https://unsloth.ai).
The majority of the codebase apart from trivial changes and fixes were created with qwen3.8 and the CSVs for
each of the HSK levels in this repo.

## Installation

Very simple installation if you have [node](https://nodejs.org/en/download) installed on your machine.

1. Download and extract the repository into a folder of your naming
2. run npm install to install all required dependencies
3. run npm start to begin the web server
4. navigate to localhost:3000 to enjoy your flashcard experience
