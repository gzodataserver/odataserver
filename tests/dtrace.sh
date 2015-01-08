#!/usr/sbin/dtrace -Z -Cs

#pragma D option quiet

/* ------------------------- start nhttpsnoop script ------------------------- */


#define MILLISEC (1000)
#define	MICROSEC (1000 * 1000)
#define	NANOSEC  (1000 * 1000 * 1000)

BEGIN
{
	printf("NOTE: The MySQL latency calculation can only handle one request at the time (not several concurrent requests)!\n");
	printf("%-12s %6s %-6s %2s %10s %-6s %-20s %s\n",
	    "TIME",
	    "PID",
	    "PROBE",
	    "",
	    "LATENCY",
	    "METHOD",
	    "PATH",
			"ADDITIONAL INFO");
	start = timestamp;
}

node*:::http-server-request,
node*:::http-client-request
{
	printf("[%3d.%06d] %6d %-6s -> %10s %-6s %-20s\n",
	    (timestamp-start)/NANOSEC,
	    (timestamp-start)%NANOSEC/1000,
	    pid,
	    strtok(probename+sizeof("http-")-1,"-"),
	    "-",
	    copyinstr(arg4),
	    strtok(copyinstr(arg5),"?"));

	last_rqstarts = rqstarts[pid, copyinstr(arg2), arg3] = timestamp;
	last_rqmethods = rqmethods[pid, copyinstr(arg2), arg3] = copyinstr(arg4);
	last_rqurls = rqurls[pid, copyinstr(arg2), arg3] = copyinstr(arg5);
}

node*:::http-server-response,
node*:::http-client-response
/rqstarts[pid, copyinstr(arg1), arg2]/
{
	printf("[%3d.%06d] %6d %-6s <- %4d.%-03dms %-6s %-20s\n",
	    (timestamp-start)/NANOSEC,
	    (timestamp-start)%NANOSEC/1000,
	    pid,
	    strtok(probename+sizeof("http-")-1,"-"),
	    (timestamp-rqstarts[pid,copyinstr(arg1),arg2])/MICROSEC,
	    ((timestamp-rqstarts[pid,copyinstr(arg1),arg2])%MICROSEC)/1000,
	    rqmethods[pid,copyinstr(arg1),arg2],
	    strtok(rqurls[pid,copyinstr(arg1),arg2],"?"));

	rqstarts[pid, copyinstr(arg1), arg2] = 0;
	rqmethods[pid, copyinstr(arg1), arg2] = 0;
	rqurls[pid, copyinstr(arg1), arg2] = 0;
}


/* SKIP GARABASE COLLECTION FOR NOW

node*:::gc-start
{
	self->gc_start = timestamp;
}

node*:::gc-done
/self->gc_start/
{
	printf("[%3d.%06d] %6d %-6s <- %4d.%-03dms %-6s %-20s\n",
	    (timestamp-start)/NANOSEC,
	    (timestamp-start)%NANOSEC/1000,
	    pid,
	    "gc",
	    (timestamp-self->gc_start)/MICROSEC,
	    ((timestamp-self->gc_start)%MICROSEC)/1000,
	    "-",
	    strtok("-","?"));
	self->gc_start = 0;
}
*/

/* ------------------------- end nhttpsnoop script ------------------------- */


mysql*:::query*,
mysql*:::*row-done
/last_rqstarts/
{
  printf("[%3d.%06d] %6d %-6s -- %4d.%-03dms %-6s %-20s %s %s %s %s\n",
    (timestamp-start)/NANOSEC,
    (timestamp-start)%NANOSEC/1000,
    pid,
    "mysql",
		(timestamp-last_rqstarts)/MICROSEC,
		((timestamp-last_rqstarts)%MICROSEC)/1000,
    "-",
    strtok("-","?"), probeprov, probemod, probefunc, probename );
}
