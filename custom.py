# this file imports custom routes into the experiment server

from flask import Blueprint, render_template, request, jsonify, Response, abort, current_app
from jinja2 import TemplateNotFound
from functools import wraps
from sqlalchemy import or_

import requests

from psiturk.psiturk_config import PsiturkConfig
from psiturk.experiment_errors import ExperimentError
from psiturk.user_utils import PsiTurkAuthorization, nocache
# for bonuses
from amt_services import MTurkServices


# # Database setup
from psiturk.db import db_session, init_db
from psiturk.models import Participant
from json import dumps, loads

# load the configuration options
config = PsiturkConfig()
config.load_config()
myauth = PsiTurkAuthorization(config)  # if you want to add a password protect route use this

# explore the Blueprint
custom_code = Blueprint('custom_code', __name__, template_folder='templates', static_folder='static')

recaptcha_secret = <<<SECRET RECAPTCHA KEY GOES HERE>>>

# for bonuses
amt_services = MTurkServices(
    config.get('AWS Access', 'aws_access_key_id'), \
    config.get('AWS Access', 'aws_secret_access_key'),
    config.getboolean('Shell Parameters', 'launch_in_sandbox_mode'))

# for bonuses
class WorkerAlreadyCredited(Exception):
    pass

class CreditTransactionError(Exception):
    pass

class WorkerNotRegistered(Exception):
    pass

class NoAMTConnection(Exception):
    pass

def yield_participants(condition):
    def generator():
    #if condition is -1, it returns all participants
        for user in Participant.query.\
            filter(or_(Participant.status == '3',Participant.status == '4',Participant.status == '5',Participant.status == '7')).\
            yield_per(5):
            cond = ""
            answers = {}
            trials = {}
            if hasattr(user, 'datastring'):
                try:
                    workerobj = loads(user.datastring)
                    answers = workerobj['questiondata']
                    cond = answers['realCondition']
                except:
                    print "malformed datastring for user", user.workerid
                try:
                    trials = workerobj['data']
                except:
                    print "no data"
                    pass
                if (cond == condition) or (condition == -1):
                    yield({'id': user.workerid,
                            'questions': answers,
                             'trials': trials})
    return generator

def getAnAssignmentId(workerId):
    #the correct thing to do would be to ask MTurk for just the one worker
    workers = amt_services.get_workers("Approved")
    if workers == False: #failure to connect
        raise NoAMTConnection()
    for worker in workers:
        print "Found this assignment:",worker['assignmentId']
        print "Status is",worker['status']
        if worker['workerId'] == workerId:
            return worker['assignmentId']
    raise WorkerNotRegistered()

def worker_bonus(assignment_id, amount, reason):
    # does not check worker status.
    try:
        if amount <= 0:
            raise CreditTransactionError()
        else:
            success = amt_services.bonus_worker(assignment_id, amount, reason)
            if success:
                print "gave bonus of $" + str(amount) + " to " + assignment_id
            else:
                print "*** failed to bonus", assignment_id
                raise CreditTransactionError()
    except:
        print "*** failed to bonus", assignment_id
        raise CreditTransactionError()
###########################################################
#  serving warm, fresh, & sweet custom, user-provided routes
#  add them here
###########################################################

#----------------------------------------------
# ReCaptcha Verify
#----------------------------------------------
@custom_code.route('/checkCaptcha', methods=['POST'])
def checkCaptcha():
    print request.json['response']

    payload = {
        'privatekey': recaptcha_secret,
        'remoteip': request.remote_addr,
        'challenge': request.json['challenge'],
        'response': request.json['response']
        }
    response = requests.post("http://www.google.com/recaptcha/api/verify", data=payload)
    print response.text
    return(response.text.split('\n')[0])

#----------------------------------------------
# example accessing data
#----------------------------------------------
#dem data csvs:
@custom_code.route('/<csvname>.csv')
@myauth.requires_auth
def generate_csv(csvname):
    try:
        conditionIndex = {"idtrials": 0, "ldttrials": 1, "questions": -1}[csvname]
    except KeyError:
        abort(404)
    workersGenerator = yield_participants(conditionIndex)
    if conditionIndex == 0: # ID
        def generate():
            yield "ID TRIALS\nWorker ID,Stimulus,Response\n"
            for worker in workersGenerator():
                for trial in worker['trials']:
                    data = trial['trialdata']
                    if data['phase'] == 'TEST':
                        yield ','.join([worker['id'], data['word'], data['response']]) + '\n'
    elif conditionIndex == 1: # LDT
        def generate():
            yield "LDT TRIALS\nWorker ID,Stimulus,Response,Reaction Time\n"
            for worker in workersGenerator():
                for trial in worker['trials']:
                    data = trial['trialdata']
                    if data['phase'] == 'TEST':
                        yield ','.join([worker['id'], data['word'], data['response'], str(data['reactionTime'])]) + '\n'
    elif conditionIndex == -1: #Questions
        def generate():
            yield "QUESTIONNAIRE RESPONSES\nWorker ID,Multilingual,First Language,Main Language\n"
            for worker in workersGenerator():
                q = worker['questions']
                try:
                    multi = q['multilingual']
                except:
                    multi = ""
                try:
                    first = q['firstlang']
                except:
                    first = ""
                try:
                    most = q['usemost']
                except:
                    most = ""
                yield ','.join([worker['id'], multi, first, most]) + '\n'

    return Response(generate(), mimetype='text/csv')

@custom_code.route('/view_data')
@myauth.requires_auth
def list_my_data():
    from datetime import datetime
    now = datetime.utcnow()
    try:
        return render_template('list.html', date = now.strftime("%Y-%m-%d %H:%M"))
    except TemplateNotFound:
        abort(404)

@custom_code.route('/view_questionable')
@myauth.requires_auth
def view_questionable():
    try:
        users = Participant.query.\
            filter(or_(Participant.status == '3',Participant.status == '4',Participant.status == '5',Participant.status == '7'))
    except:
        users = []

    nonWords = ["baf","baich","bap","bawf","beal","beeve","bej","bem","bess","bice","bis","boke","bome","bool","bup","cabe","ch-all","chab","chake","cheel","cheen","cheeth","chell","chies","chipe","chis","chol","chome","chone","chope","chot","chune","chuth","chyer","coas","coss","cowf","dabe","dahr","dak","datch","deach","deef","deek","deet","dess","detch","dit","dizz","dobe","dodd","doe-g","doke","doof","duj","fak","fal","fatch","fath","fawed","faws","faych","feg","fen","fet","fid","fide","fik","fiss","fode","foes","foin","foize","foof","foon","fouze","fu-s","fub","fuhl","fum","fup","fut","futh","gad","gade","gam","gan","gath","gawm","geck","ged","geed","gen","gep","gern","gern2","gert","gev","gine","ging","goo-t","goov","gowd","hab","hame","han","heeg","heem","hej","herch","hess","hez","hib","hin","hish","ho-ss","hoon","hout","hud","hup","huv","huz","jad","jame","jare","jave","jeck","jeeg","jeek","jeet","jerz","jez","jide","jile","jir","jiss","jite","joig","joit","jole","jope","joss","jud","jum","kade","kay-sh","ked","keek","keem","keet","kell","kep","kerm","kess","kez","kibe","kine","kith","kobe","koss","koze","kuh-p","laje","layle","leck","leet","lel","lem","len","lerm","lib","lig","lin","lish","loke","loof","losse","lote","lud","lurd","luss","lut","lyth","mag","mawtch","mayb","meef","meese","meeve","meg","mem","merf","mert","mev","mide","mize","moise","moke","mose","mought","moun","mub","mun","muth","muuth","naff","natch","nawss","neek","nem","nid","nide","nish","niz","noff","noss","nowk","nuck","nud","pab","paim","ped","peef","pej","pell","perf","pev","pice","pid","pite","pode","pote","poun","pous","powed","pud","puhn","pum","pung","purn","raf","reeb","reen","reet","reeze","rell","rem","ress","ret","reth","rill","rin","rish","rive","rofe","roise","roke","ross","roud","rous","rull","rup","sab","sach","saip","saj","sap","sayz","sed","seeg","seeve","sem","sep","serd","serk","serm","sess","shab","shafe","shan","shate","sheb","shech","shen","shern","shet","sheth","shid","shoil","shoov","shope","showth","shub","shul","shum","shune","sig","sive","soize","soof","soot","sose","sote","sull","tade","tafe","taish","tal","tase","tash","tass","tatch","tath","tawz","terl","tert","terth","terze","tess","tev","thake","theet","thig","thode","thood","thote","thung","thuse","tid","tig","tiv","toeg","toesh","toik","toob","toop","tuht","tung","tup","turch","tuz","vab","vaf","vake","vall","vap","veeg","vet","vin","vipe","vite","vok","voss","vues","waip","wais","weem","weg","wek","werch","wern","wesh","wess","whime","wiche","wid","wike","woe-l","woe-sh","wone","wote","wout","wuk","yade","yare","yeek","yeeze","yek","yem","yesh","yet","yine","yiss","yit","yode","yole","yoss","yote","yoze","zang","zeech","zeed","zeer","zide","zile","zize","zode","zole","zot","zote","zung","zup"]

    poorWorkers = []
    for user in users:
        cond = ""
        answers = {}
        trials = {}
        if hasattr(user, 'datastring'):
            correct = 0
            total = 0
            try:
                workerobj = loads(user.datastring)
                answers = workerobj['questiondata']
                cond = answers['realCondition']
            except:
                print "malformed datastring for user", user.workerid
            try:
                trials = workerobj['data']
            except:
                print "no data"
                pass
            for trial in trials:
                data = trial['trialdata']
                if data['phase'] == 'TEST':
                    total += 1
                    if cond == 0: #id
                        if data['word'].lower() == data['response'].lower():
                            correct += 1
                    elif cond == 1: #ldt
                        isNonWord = data['word'] in nonWords
                        if (isNonWord and data['response'] == "nonWord") \
                            or (not isNonWord and data['response'] == "word"):
                            correct += 1
            score = float(correct)/total*100
            if  (cond == 0 and score <= 10) or (cond == 1 and score <= 55):
                poorWorkers.append({"workerId": user.workerid, "condition":["id","ldt"][cond],"score": round(score, 1)})

    try:
        return render_template('questionable.html', workers = poorWorkers)
    except TemplateNotFound:
        abort(404)

@custom_code.route('/view_single')
@myauth.requires_auth
def view_single():
    workerId = request.args['workerId']
    cleanTrials = []
    user = Participant.query.\
            filter(Participant.workerid == workerId).first()
    workerobj = loads(user.datastring)
    trials = workerobj['data']
    for trial in trials:
        data = trial['trialdata']
        if data['phase'] == 'TEST':
            cleanTrials.append({"stim": data['word'], "response": data['response']})
    try:
        return render_template('single.html', workerId = workerId, trials = cleanTrials)
    except TemplateNotFound:
        abort(404)

@custom_code.route('/compensate')
def compensate():
    #getrequest parts
    try:
        workerId = request.args['workerId']
    except: #keyError: now workerId was provided
        #render dat entry page
        try:
            return render_template('compensateentry.html')
        except TemplateNotFound:
            abort(404)
    if workerId == "":
        try:
            return render_template('compensateentry.html')
        except TemplateNotFound:
            abort(404)

    # Messages. Maybe move into the template?
    messages = {
        "hitSubbed": {"type": "success", 
                    "title": "Your HIT is under review.", 
                    "content": "It looks like you already submitted your HIT. We'll take action on it soon!"},
        "returnHIT": {"type": "info",
                    "title":"Please return your HIT.",
                    "content":"In order to recieve compensation, please submit or return your HIT then refresh this page. Thanks."},
        "notEnough": {"type": "info",
                    "title":"Sorry; you're not eligible for payment.",
                    "content": "It looks like you didn't make it far enough into the experiment to be eligible for payment. However, we've removed you from our list of participants so if we ever run the experiment again, you may participate!"},
        "takeDummy": {"type": "info",
                    "title":"Please complete the Compensation HIT.",
                    "content": """Because you haven't submitted work for us in the past, we need you to complete a 'dummy' compensation HIT. Follow these instructions:
                    <ol>
                        <li>Return the HIT if you have not yet done so.
                        <li>Go here: <a href="https://www.mturk.com/mturk/searchbar?selectedSearchType=hitgroups&requesterId=AH1PO6KC4YRE3" target="_blank">CPL's HITs on MTurk</a>
                        <li>Take and submit the HIT called "Psiturk Compensation HIT - DO NOT TAKE UNLESS INSTRUCTED TO DO SO"
                        <li>Wait 3-5 minutes and refresh this page.
                    </ol>"""},
        "success": {"type": "success",
                 "title": "We have credited your account.",
                 "content": "Thanks - you've been given a bonus of $%s for your time."},
        "alreadyPayed": {"type": "success",
                       "title": "You've been payed.",
                       "content": "Our records show you have already been payed for this HIT. Thanks for your participation!"},
        "fatal": {"type": "warning",
                "title": "Something went wrong.",
                "content": """Please contact us at <a href="mailto:mturkperception@gmail.com">mturkperception@gmail.com</a> and include the following information:
                <ul>
                    <li>worker id: %(workerid)s
                    <li>assignmentid: %(assignmentid)s
                </ul>
                """}
        }

    # Get the row of the worker in the database
    worker = Participant.query.\
            filter(Participant.workerid == workerId).first()
            # filter(Participant.assignmentid == assignmentId,
            #     Participant.hitid == hitId).first()

    # If the worker is in the db, check status
    if worker:
        #grab the rest of the info
        hitId = worker.hitid
        assignmentId = worker.assignmentid

        #if worker has already submitted,
        if worker.status in [4]:
            message = messages['hitSubbed']
        #if the worker was already bonused
        elif worker.status in [5,7]:
            message = messages['alreadyPayed']
        #if the worker's HIT is still in progress, tell them to turn it in 
        elif worker.status in [0,1,2,3]:
            message = messages['returnHIT']
        #if the worker did in fact quit early (meaning they can't finish it)
        else: # worker.status == 6
            #get trialCount and conditionNum
            conditionNum = ""
            trialCount = 0
            if hasattr(worker, 'datastring'):
                try: # get condition
                    workerobj = loads(worker.datastring)
                    conditionNum = workerobj['questiondata']['realCondition']
                except:
                    #print "malformed datastring for worker", worker.workerid
                    pass
                try: #count trials
                    trials = workerobj['data']
                    for trial in trials:
                        trialCount += int(trial['trialdata']['phase'] == 'TEST')
                except:
                    # print "no data"
                    pass
            #If they didn't complete any trials, 
            # remove them from db and display sorry
            print "Num trials completed:", trialCount
            if trialCount == 0:
                db_session.delete(worker)
                db_session.commit()
                message = messages['notEnough']
            else: #they completed some of the trials
                #min bonus is 1 c.
                amount = max(0.01,round(float(trialCount)/[417,818][conditionNum]*2.50,2))
                amount = min(amount, 2.50) #sanity check
                try:
                    bonusAssignment = getAnAssignmentId(workerId)
                    worker_bonus(bonusAssignment, amount, 'auto bonus system')
                    
                    #update worker
                    worker.status = 7
                    db_session.add(worker)
                    db_session.commit()

                    message = messages['success']
                    message['content'] = message['content'] % amount
                except NoAMTConnection:
                    abort(503)
                except WorkerAlreadyCredited:
                    message = messages['alreadyPayed']
                except CreditTransactionError:
                    message = messages['fatal']
                    message['content'] = message['content'] % {"workerid": workerId, "assignmentid": assignmentId}
                except WorkerNotRegistered:
                    message = messages['takeDummy']
    else:
        message = messages['notEnough']

    try:
        return render_template('compensate.html', message = message, workerId = workerId)
    except TemplateNotFound:
        abort(404)
