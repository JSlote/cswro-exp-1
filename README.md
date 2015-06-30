# Conducting spoken word recognition research online: Validation and a new timing method
######Joseph Slote and Julia F. Strand

**Abstract:** Models of spoken word recognition typically make
predictions that are then tested in the laboratory against the
word recognition scores of human subjects (e.g., Luce &
Pisoni Ear and Hearing, 19, 1–36, 1998). Unfortunately, laboratory
collection of large sets of word recognition data can be
costly and time-consuming. Due to the numerous advantages of
online research in speed, cost, and participant diversity, some
labs have begun to explore the use of online platforms such as
Amazon’s Mechanical Turk (AMT) to source participation and
collect data (Buhrmester, Kwang, & Gosling Perspectives on
Psychological Science, 6, 3–5, 2011). Many classic findings in
cognitive psychology have been successfully replicated online,
including the Stroop effect, task-switching costs, and Simon
and flanker interference (Crump, McDonnell, & Gureckis
PLoS ONE, 8, e57410, 2013). However, tasks requiring auditory
stimulus delivery have not typically made use of AMT. In
the present study, we evaluated the use of AMT for collecting
spoken word identification and auditory lexical decision data.
Although online users were faster and less accurate than participants
in the lab, the results revealed strong correlations between
the online and laboratory measures for both word identification
accuracy and lexical decision speed. In addition, the
scores obtained in the lab and online were equivalently correlated
with factors that have been well established to predict
word recognition, including word frequency and phonological
neighborhood density. We also present and analyze a method
for precise auditory reaction timing that is novel to behavioral
research. Taken together, these findings suggest that AMT can
be a viable alternative to the traditional laboratory setting as a
source of participation for some spoken word recognition
research.


## Experiment 1

This is the code repository for Experiment One of the [above-titled study](https://apps.carleton.edu/curricular/psyc/jstrand/assets/Slote_and_Strand_BRM.pdf). The experiment is designed to be run using [psiTurk](https://psiturk.org/) version 2.1.1 on the Amazon Mechanical Turk platform.

After calibration and instructions, the experiment consists of two separate tasks (each participant completes only one):

1. Auditory Lexical Decision Task on consonant–vowel–consonant (CVC) words and phonotactilly legal nonwords (400 each)
2. Identification Task on 400 CVC words

Of general interest are the following features:
- Cursor auto-hiding during experiment proper,
- Audio preloading including a progress bar pop-up,
- Fullscreen requirement to mitigate distraction (participants are asked to enter fullscreen and the experiment is paused (all input blocked) if they exit prematurely),
- Basic asynchronous flow control for transitioning between stages of the experiment,
- and Audio reCaptcha integration (you will have to input your reCaptcha keys in custom.py and task.js for this feature to function).

You are welcome to use this code for personal or academic uses. If you use all or portions of this project in an academic paper, please cite as follows:

> Slote, J., & Strand, J. (2015). Conducting spoken word recognition research online: Validation and a new timing method. *Behavior Research Methods*. doi: 10.3758/s13428-015-0599-7.

For more information about this study or the Carleton Perception Lab, please visit https://apps.carleton.edu/curricular/psyc/jstrand/research/resources/
