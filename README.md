# RabbitMQ Listener - TACK
A containerised nodejs event listener that listens to RabbitMQ and passes requests on to an internal endpoint

## Environment Variables

The following environment variables need to be passed to the container:

### ACK Logging
```
ENV TEAMNAME=[YourTeamName]
ENV CHALLENGEAPPINSIGHTS_KEY=[Challenge Application Insights Key] //Given by the proctors
```
### For RabbitMQ
```
ENV AMQPURL=amqp://[url]l:5672
```
### For Process Endpoint
```
ENV PROCESSENDPOINT=http://fulfillorder.[namespace].svc.cluster.local:8080/v1/order/
```
