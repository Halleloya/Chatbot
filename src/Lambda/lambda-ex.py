import boto3
import logging
import json

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)
client_run = boto3.client('lex-runtime',region_name='us-east-1')
client_model = boto3.client('lex-models',region_name='us-east-1')

def lambda_handler(event, context):
    msg = str(event['inputText'])
    response = client_run.post_text(
        botName='YOUR_BOT_NAME',
        botAlias='YOUR_BOT_ALIAS',
        userId='yy',
        inputText=str(msg)
    )
    bot_details = client_model.get_bot(
        name='YOUR_BOT_NAME',
        versionOrAlias='$LATEST'
    )
    return response